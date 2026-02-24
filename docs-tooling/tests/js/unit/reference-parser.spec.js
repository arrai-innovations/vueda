import {
    normalizeTerm,
    parseApiRef,
    parseFrontmatter,
    parseTermRef,
    stripInlineMarkdown,
} from "../../../js/utils/reference-parser.js";
import { describe, expect, it } from "vitest";

describe("parseFrontmatter", () => {
    it("extracts key-value pairs from YAML frontmatter", () => {
        const raw = "---\ntitle: Hello\nid: my-id\n---\n\n# Body";
        const { frontmatter, body } = parseFrontmatter(raw);
        expect(frontmatter.title).toBe("Hello");
        expect(frontmatter.id).toBe("my-id");
        expect(body).toBe("# Body");
    });

    it("handles double-quoted values", () => {
        const raw = '---\ntitle: "Hello World"\n---\n';
        const { frontmatter } = parseFrontmatter(raw);
        expect(frontmatter.title).toBe("Hello World");
    });

    it("handles single-quoted values", () => {
        const raw = "---\ntitle: 'Hello World'\n---\n";
        const { frontmatter } = parseFrontmatter(raw);
        expect(frontmatter.title).toBe("Hello World");
    });

    it("returns empty frontmatter when no delimiters present", () => {
        const raw = "# No frontmatter";
        const { frontmatter, body } = parseFrontmatter(raw);
        expect(frontmatter).toEqual({});
        expect(body).toBe(raw);
    });
});

describe("normalizeTerm", () => {
    it("lowercases and collapses whitespace", () => {
        expect(normalizeTerm("  Hello   World  ")).toBe("hello world");
    });
});

describe("stripInlineMarkdown", () => {
    it("strips backticks", () => {
        expect(stripInlineMarkdown("`code`")).toBe("code");
    });

    it("strips markdown links", () => {
        expect(stripInlineMarkdown("[text](url)")).toBe("text");
    });

    it("strips bold/italic markers", () => {
        expect(stripInlineMarkdown("**bold** and _italic_")).toBe("bold and italic");
    });
});

describe("parseApiRef", () => {
    it("parses a simple api reference", () => {
        const src = "{@api py:module.Class}";
        const result = parseApiRef(src, 0);
        expect(result).toEqual({
            raw: "{@api py:module.Class}",
            rawId: "py:module.Class",
            length: 22,
        });
    });

    it("returns null for non-matching input", () => {
        expect(parseApiRef("no match", 0)).toBeNull();
    });

    it("returns null when no space after @api", () => {
        expect(parseApiRef("{@apifoo}", 0)).toBeNull();
    });

    it("returns null for empty id", () => {
        expect(parseApiRef("{@api }", 0)).toBeNull();
    });

    it("handles nested braces", () => {
        const src = "{@api id{nested}}";
        const result = parseApiRef(src, 0);
        expect(result).toEqual({
            raw: "{@api id{nested}}",
            rawId: "id{nested}",
            length: 17,
        });
    });

    it("parses at a non-zero position", () => {
        const src = "prefix {@api some:id}";
        const result = parseApiRef(src, 7);
        expect(result).toEqual({
            raw: "{@api some:id}",
            rawId: "some:id",
            length: 14,
        });
    });

    it("strips markdown backslash escapes from the id", () => {
        const src = "{@api py:function:Mixin.\\_extract_relations}";
        const result = parseApiRef(src, 0);
        expect(result.rawId).toBe("py:function:Mixin._extract_relations");
        expect(result.raw).toBe(src);
    });
});

describe("parseTermRef", () => {
    it("parses a simple term reference", () => {
        const src = "{@term Model}";
        const result = parseTermRef(src, 0);
        expect(result).toEqual({
            raw: "{@term Model}",
            rawTerm: "Model",
            length: 13,
        });
    });

    it("returns null for non-matching input", () => {
        expect(parseTermRef("no match", 0)).toBeNull();
    });

    it("returns null when no space after @term", () => {
        expect(parseTermRef("{@termfoo}", 0)).toBeNull();
    });

    it("returns null for empty term", () => {
        expect(parseTermRef("{@term }", 0)).toBeNull();
    });

    it("returns null for unclosed brace", () => {
        expect(parseTermRef("{@term hello", 0)).toBeNull();
    });

    it("parses at a non-zero position", () => {
        const src = "see {@term Widget}";
        const result = parseTermRef(src, 4);
        expect(result).toEqual({
            raw: "{@term Widget}",
            rawTerm: "Widget",
            length: 14,
        });
    });
});
