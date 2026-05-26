import {
    SOURCES,
    computeHashes,
    hashSource,
    readManifest,
    resolveImportClosure,
    selectStale,
    sourceFiles,
    writeManifest,
} from "../../../js/build/plan.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

function sourceByKey(key) {
    return SOURCES.find((s) => s.key === key);
}

function relFilesFor(key) {
    return sourceFiles(REPO_ROOT, sourceByKey(key)).map((f) => path.relative(REPO_ROOT, f).split(path.sep).join("/"));
}

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

    it("folds the transitive import closure of tooling entrypoints into the file set", () => {
        write("js/tool.js", 'import { x } from "./helper.js";\nimport { y } from "../shared/deep.js";');
        write("js/helper.js", 'import { compact } from "../shared/compact.js";');
        write("shared/compact.js", "export const compact = 1;");
        write("shared/deep.js", "export const y = 2;");
        const files = rel(sourceFiles(root, { ...source, inputs: [], tooling: ["js/tool.js"] }));
        expect(files).toEqual(["js/helper.js", "js/tool.js", "shared/compact.js", "shared/deep.js"]);
    });
});

describe("resolveImportClosure", () => {
    it("follows relative imports transitively and ignores bare package specifiers", () => {
        write("a.js", 'import fs from "node:fs";\nimport { b } from "./b.js";\nimport pkg from "some-package";');
        write("b.js", 'export { c } from "./c.js";');
        write("c.js", "export const c = 1;");
        const closure = resolveImportClosure([path.join(root, "a.js")]);
        expect(rel(closure)).toEqual(["a.js", "b.js", "c.js"]);
    });

    it("does not throw on a missing imported module", () => {
        write("a.js", 'import { gone } from "./missing.js";');
        const closure = resolveImportClosure([path.join(root, "a.js")]);
        // The resolved-but-missing path is still tracked; sourceFiles filters it out.
        expect(rel(closure)).toEqual(["a.js", "missing.js"]);
    });

    it("terminates on cyclic imports", () => {
        write("a.js", 'import { b } from "./b.js";');
        write("b.js", 'import { a } from "./a.js";');
        const closure = resolveImportClosure([path.join(root, "a.js")]);
        expect(rel(closure)).toEqual(["a.js", "b.js"]);
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

describe("SOURCES wiring (real repo)", () => {
    it("tracks shared normalizer helpers via the import closure", () => {
        // Regression: editing utils/source.js or utils/compact.js must invalidate
        // the canonical bundles whose normalizers import them.
        for (const key of ["python", "javascript", "components"]) {
            const files = relFilesFor(key);
            expect(files).toContain("docs-tooling/js/utils/source.js");
            expect(files).toContain("docs-tooling/js/utils/compact.js");
            expect(files).toContain("docs-tooling/js/core.js");
        }
    });

    it("tracks TypeDoc config files for the javascript source", () => {
        const files = relFilesFor("javascript");
        expect(files).toContain("docs-tooling/typedoc.json");
        expect(files).toContain("docs-tooling/typedoc.tsconfig.json");
        expect(files).toContain("client/tsconfig.json");
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
