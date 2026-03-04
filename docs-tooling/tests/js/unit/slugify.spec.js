import { normalizePath, slugify } from "../../../js/utils/slugify.js";
import { describe, expect, it } from "vitest";

describe("normalizePath", () => {
    it("converts backslashes to forward slashes", () => {
        expect(normalizePath("foo\\bar\\baz")).toBe("foo/bar/baz");
    });

    it("leaves already-forward-slashed paths unchanged", () => {
        expect(normalizePath("foo/bar/baz")).toBe("foo/bar/baz");
    });

    it("returns falsy values unchanged", () => {
        expect(normalizePath("")).toBe("");
        expect(normalizePath(null)).toBe(null);
        expect(normalizePath(undefined)).toBe(undefined);
    });
});

describe("slugify", () => {
    it("replaces spaces and special chars with hyphens", () => {
        expect(slugify("Hello World!")).toBe("Hello-World");
    });

    it("preserves underscores (they are in the allowed character set)", () => {
        expect(slugify("hello_world")).toBe("hello_world");
    });

    it("collapses consecutive separators into a single hyphen", () => {
        expect(slugify("a  b")).toBe("a-b");
    });

    it("strips leading and trailing hyphens and slashes", () => {
        expect(slugify("!hello!")).toBe("hello");
    });

    it("returns 'index' for empty input", () => {
        expect(slugify("")).toBe("index");
    });

    it("returns 'index' for null/undefined input", () => {
        expect(slugify(null)).toBe("index");
        expect(slugify(undefined)).toBe("index");
    });

    it("preserves allowed characters: alphanumeric, slashes, dots, hyphens", () => {
        expect(slugify("foo/bar-baz.js")).toBe("foo/bar-baz.js");
    });

    it("removes curly braces", () => {
        expect(slugify("/widgets/{id}")).toBe("widgets/id");
    });

    it("converts backslashes via normalizePath before slugifying", () => {
        expect(slugify("foo\\bar")).toBe("foo/bar");
    });
});
