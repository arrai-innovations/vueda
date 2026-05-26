import {
    computeHashes,
    hashSource,
    readManifest,
    selectStale,
    sourceFiles,
    writeManifest,
} from "../../../js/build/plan.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const source = {
    key: "demo",
    extractTarget: "demo",
    normalizeSource: "demo",
    canonical: "demo.canonical.json",
    inputs: [
        { type: "tree", dir: "src", exts: [".js"] },
        { type: "file", path: "one.css" },
        { type: "children", dir: "families", name: "index.js" },
    ],
    tooling: ["tool.js"],
};

let root;
let generatedDir;

function write(rel, contents = "x") {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
}

function rel(files) {
    return files.map((f) => path.relative(root, f).split(path.sep).join("/")).sort();
}

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "docs-plan-"));
    generatedDir = path.join(root, ".generated");
    fs.mkdirSync(generatedDir, { recursive: true });
    write("src/a.js");
    write("src/nested/b.js");
    write("src/c.ts"); // excluded by exts
    write("one.css");
    write("families/x/index.js");
    write("families/y/index.js");
    write("families/z/other.js"); // excluded: wrong name
    write("tool.js");
});

afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
});

describe("sourceFiles", () => {
    it("resolves tree, file, children, and tooling specs and excludes non-matches", () => {
        expect(rel(sourceFiles(root, source))).toEqual([
            "families/x/index.js",
            "families/y/index.js",
            "one.css",
            "src/a.js",
            "src/nested/b.js",
            "tool.js",
        ]);
    });

    it("treats missing input dirs/files as empty rather than erroring", () => {
        const sparse = { ...source, inputs: [{ type: "tree", dir: "does-not-exist", exts: [".js"] }] };
        expect(rel(sourceFiles(root, sparse))).toEqual(["tool.js"]);
    });
});

describe("hashSource / computeHashes", () => {
    it("is stable across calls with no changes", () => {
        expect(hashSource(root, source)).toBe(hashSource(root, source));
    });

    it("changes when an input file's contents change", () => {
        const before = hashSource(root, source);
        write("src/a.js", "different");
        expect(hashSource(root, source)).not.toBe(before);
    });

    it("changes when a tooling file changes", () => {
        const before = hashSource(root, source);
        write("tool.js", "patched");
        expect(hashSource(root, source)).not.toBe(before);
    });

    it("changes when a matching input file is added", () => {
        const before = hashSource(root, source);
        write("src/new.js");
        expect(hashSource(root, source)).not.toBe(before);
    });

    it("computeHashes keys by source key", () => {
        expect(Object.keys(computeHashes(root, [source]))).toEqual(["demo"]);
    });
});

describe("selectStale", () => {
    function withCanonical() {
        fs.writeFileSync(path.join(generatedDir, source.canonical), "{}");
    }

    it("is not stale when manifest matches and canonical exists", () => {
        withCanonical();
        const currentHashes = computeHashes(root, [source]);
        const stale = selectStale({ sources: [source], currentHashes, manifest: currentHashes, generatedDir });
        expect(stale).toEqual([]);
    });

    it("is stale when the manifest hash differs", () => {
        withCanonical();
        const currentHashes = computeHashes(root, [source]);
        const stale = selectStale({ sources: [source], currentHashes, manifest: { demo: "old" }, generatedDir });
        expect(stale.map((s) => s.key)).toEqual(["demo"]);
    });

    it("is stale when the source is absent from the manifest", () => {
        withCanonical();
        const currentHashes = computeHashes(root, [source]);
        const stale = selectStale({ sources: [source], currentHashes, manifest: {}, generatedDir });
        expect(stale.map((s) => s.key)).toEqual(["demo"]);
    });

    it("is stale when the canonical artifact is missing even if the hash matches (bootstrap)", () => {
        const currentHashes = computeHashes(root, [source]);
        const stale = selectStale({ sources: [source], currentHashes, manifest: currentHashes, generatedDir });
        expect(stale.map((s) => s.key)).toEqual(["demo"]);
    });
});

describe("readManifest / writeManifest", () => {
    it("round-trips a manifest", () => {
        const manifestPath = path.join(generatedDir, "extract-manifest.json");
        writeManifest(manifestPath, { demo: "abc" });
        expect(readManifest(manifestPath)).toEqual({ demo: "abc" });
    });

    it("returns an empty object when the manifest is absent", () => {
        expect(readManifest(path.join(generatedDir, "missing.json"))).toEqual({});
    });
});
