import { getRepoRoot, normalizeSourceFile } from "../../../js/utils/source.js";
import { describe, expect, it } from "vitest";

describe("getRepoRoot", () => {
    it("returns a string ending with the repo directory name", () => {
        const root = getRepoRoot();
        expect(typeof root).toBe("string");
        expect(root.endsWith("vueda") || root.endsWith("vueda/")).toBe(true);
    });
});

describe("normalizeSourceFile", () => {
    const repoRoot = "/project/vueda";

    it("returns a relative path for a file inside the repo root", () => {
        const abs = "/project/vueda/server/app.py";
        expect(normalizeSourceFile(abs, repoRoot)).toBe("server/app.py");
    });

    it("returns undefined for a path outside the repo root", () => {
        const outside = "/home/user/other/file.py";
        expect(normalizeSourceFile(outside, repoRoot)).toBeUndefined();
    });

    it("returns undefined for undefined input", () => {
        expect(normalizeSourceFile(undefined, repoRoot)).toBeUndefined();
    });

    it("returns undefined for null input", () => {
        expect(normalizeSourceFile(null, repoRoot)).toBeUndefined();
    });

    it("returns undefined for a non-string input", () => {
        expect(normalizeSourceFile(42, repoRoot)).toBeUndefined();
    });

    it("handles a relative path by resolving it against repoRoot", () => {
        const relative = "docs-tooling/py/dump_pdoc.py";
        const result = normalizeSourceFile(relative, repoRoot);
        expect(result).toBe("docs-tooling/py/dump_pdoc.py");
    });
});
