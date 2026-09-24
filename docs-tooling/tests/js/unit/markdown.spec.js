import {
    escapeText,
    formatMembers,
    formatParameters,
    linkToId,
    linkToPath,
    normalizeTitle,
    renderCodeInline,
    renderFrontmatter,
    renderHeading,
    renderList,
    renderTable,
} from "../../../js/renderers/markdown.js";
import { describe, expect, it } from "vitest";

describe("renderFrontmatter", () => {
    it("renders a valid YAML frontmatter block", () => {
        const result = renderFrontmatter({ title: "My Page", id: "x" });
        expect(result).toContain("---");
        expect(result).toContain('title: "My Page"');
        expect(result).toContain('id: "x"');
        expect(result.startsWith("---\n")).toBe(true);
        expect(result.endsWith("---\n")).toBe(true);
    });

    it("omits undefined values", () => {
        const result = renderFrontmatter({ a: "yes", b: undefined });
        expect(result).toContain("a:");
        expect(result).not.toContain("b:");
    });

    it("returns empty string for empty frontmatter", () => {
        expect(renderFrontmatter({})).toBe("");
        expect(renderFrontmatter(undefined)).toBe("");
    });
});

describe("renderHeading", () => {
    it("renders the correct number of # signs", () => {
        expect(renderHeading(2, "Section")).toBe("## Section");
    });

    it("renders level 1 heading", () => {
        expect(renderHeading(1, "Title")).toBe("# Title");
    });

    it("renders level 4 heading", () => {
        expect(renderHeading(4, "Sub")).toBe("#### Sub");
    });
});

describe("escapeText", () => {
    it("escapes < > and & characters", () => {
        expect(escapeText("<foo> & bar")).toBe("&lt;foo&gt; &amp; bar");
    });

    it("does not escape double quotes", () => {
        expect(escapeText('"hello"')).toBe('"hello"');
    });

    it("returns empty string for null or undefined", () => {
        expect(escapeText(null)).toBe("");
        expect(escapeText(undefined)).toBe("");
    });

    it("converts non-string values to string first", () => {
        expect(escapeText(42)).toBe("42");
    });

    it("leaves an inline code span verbatim", () => {
        expect(escapeText("use `<field>_lookup` here")).toBe("use `<field>_lookup` here");
    });

    it("escapes prose on either side of a code span", () => {
        expect(escapeText("<a> `<b>` <c>")).toBe("&lt;a&gt; `<b>` &lt;c&gt;");
    });

    it("leaves a fenced block verbatim", () => {
        const source = ["prose <a>", "", "```py", "path('<str:model>/')", "```", "", "more <b>"].join("\n");
        const escaped = escapeText(source);
        expect(escaped).toContain("path('<str:model>/')");
        expect(escaped).toContain("prose &lt;a&gt;");
        expect(escaped).toContain("more &lt;b&gt;");
    });

    it("closes a fence only on a matching marker", () => {
        const source = ["~~~text", "keep <a>", "```", "keep <b>", "~~~", "prose <c>"].join("\n");
        const escaped = escapeText(source);
        expect(escaped).toContain("keep <a>");
        expect(escaped).toContain("keep <b>");
        expect(escaped).toContain("prose &lt;c&gt;");
    });

    it("leaves a code span that wraps across lines verbatim", () => {
        expect(escapeText("raises ``ValueError: '<lookup>' was\nalready seen`` when reused")).toBe(
            "raises ``ValueError: '<lookup>' was\nalready seen`` when reused",
        );
    });

    it("does not let a code span reach past a blank line", () => {
        expect(escapeText("open ` <a>\n\n<b> ` close")).toBe("open ` &lt;a&gt;\n\n&lt;b&gt; ` close");
    });

    it("leaves an indented code block verbatim", () => {
        const source = ["For example::", "", "    def meth(self) -> int:", "        ...", "", "prose <a>"].join("\n");
        const escaped = escapeText(source);
        expect(escaped).toContain("def meth(self) -> int:");
        expect(escaped).toContain("prose &lt;a&gt;");
    });

    it("escapes an indented line that continues a paragraph", () => {
        expect(escapeText("prose starts here\n    and wraps <a>")).toBe("prose starts here\n    and wraps &lt;a&gt;");
    });

    it("escapes an unpaired backtick as prose", () => {
        expect(escapeText("a ` <b>")).toBe("a ` &lt;b&gt;");
    });
});

describe("renderCodeInline", () => {
    it("wraps a simple value in single backticks", () => {
        expect(renderCodeInline("hello")).toBe("`hello`");
    });

    it("uses double-backtick fence and spaces when value contains a backtick", () => {
        expect(renderCodeInline("a`b")).toBe("`` a`b ``");
    });

    it("uses triple-backtick fence when value contains double backticks", () => {
        expect(renderCodeInline("a``b")).toBe("``` a``b ```");
    });

    it("returns empty string for falsy input", () => {
        expect(renderCodeInline("")).toBe("");
        expect(renderCodeInline(null)).toBe("");
        expect(renderCodeInline(undefined)).toBe("");
    });
});

describe("renderTable", () => {
    it("renders a markdown table with header and rows", () => {
        const result = renderTable(
            ["A", "B"],
            [
                ["1", "2"],
                ["3", "4"],
            ],
        );
        expect(result).toContain("| A | B |");
        expect(result).toContain("| --- | --- |");
        expect(result).toContain("| 1 | 2 |");
        expect(result).toContain("| 3 | 4 |");
    });

    it("returns empty string for empty rows", () => {
        expect(renderTable(["A", "B"], [])).toBe("");
    });

    it("escapes pipe characters in cells", () => {
        const result = renderTable(["X"], [["a|b"]]);
        expect(result).toContain("a\\|b");
    });

    it("collapses newlines in cell values to a single space", () => {
        const result = renderTable(["X"], [["first line\nsecond line"]]);
        expect(result).toContain("first line second line");
        expect(result).not.toContain("\n\n");
    });
});

describe("renderList", () => {
    it("renders items as a dash list joined by newlines", () => {
        const result = renderList(["x", "y"]);
        expect(result).toBe("- x\n- y");
    });

    it("returns empty string for empty array", () => {
        expect(renderList([])).toBe("");
    });
});

describe("linkToId", () => {
    it("renders a markdown link using idToFilename", () => {
        const result = linkToId("Foo", "py:class:Foo");
        expect(result).toBe("[Foo](./py:class:Foo.md)");
    });

    it("replaces unsafe characters in the id with underscores", () => {
        const result = linkToId("X", "ns/name");
        expect(result).toContain("ns_name.md");
    });
});

describe("linkToPath", () => {
    it("renders a relative markdown link between two paths", () => {
        const result = linkToPath("Foo", "api/Foo.md", "api/bar.md");
        expect(result).toBe("[Foo](Foo.md)");
    });

    it("returns the label as plain text when targetPath is falsy", () => {
        expect(linkToPath("Foo", null, "api/bar.md")).toBe("Foo");
        expect(linkToPath("Foo", undefined, "api/bar.md")).toBe("Foo");
    });

    it("normalizes backslashes in the relative path", () => {
        // On Windows, path.relative may produce backslashes; normalizePath should fix them.
        const result = linkToPath("X", "docs/sub/page.md", "docs/index.md");
        expect(result).not.toContain("\\");
    });
});

describe("normalizeTitle", () => {
    it("returns the input text when truthy", () => {
        expect(normalizeTitle("hello")).toBe("hello");
    });

    it("returns 'Untitled' for empty string", () => {
        expect(normalizeTitle("")).toBe("Untitled");
    });

    it("returns 'Untitled' for null or undefined", () => {
        expect(normalizeTitle(null)).toBe("Untitled");
        expect(normalizeTitle(undefined)).toBe("Untitled");
    });
});

describe("formatParameters", () => {
    it("treats missing optional as required for sparse TypeDoc flags", () => {
        const rows = formatParameters([
            { name: "a", optional: true, type: { name: "number" } },
            { name: "b", optional: undefined, type: { name: "number" } },
        ]);

        expect(rows[0][2]).toBe("no");
        expect(rows[1][2]).toBe("yes");
    });

    it("wraps type column in inline code", () => {
        const rows = formatParameters([{ name: "x", type: { name: "Array<string>" } }]);
        expect(rows[0][1]).toBe("`Array<string>`");
    });

    it("leaves type column empty when type is absent", () => {
        const rows = formatParameters([{ name: "x" }]);
        expect(rows[0][1]).toBe("");
    });
});

describe("formatMembers", () => {
    it("wraps type column in inline code", () => {
        const rows = formatMembers(
            [{ kind: "prop", name: "variant", type: { name: "VariantProps<typeof toggleVariants>" } }],
            "prop",
        );
        expect(rows[0][1]).toBe("`VariantProps<typeof toggleVariants>`");
    });

    it("leaves type column empty when type is absent", () => {
        const rows = formatMembers([{ kind: "prop", name: "x" }], "prop");
        expect(rows[0][1]).toBe("");
    });

    it("wraps the default column in inline code so raw expressions cannot be parsed as HTML", () => {
        const rows = formatMembers(
            [
                {
                    kind: "prop",
                    name: "slowAfterMs",
                    default: '() => { if (typeof window === "undefined") return 3000; }',
                },
            ],
            "prop",
        );
        expect(rows[0][3]).toBe('`() => { if (typeof window === "undefined") return 3000; }`');
    });

    it("leaves the default column empty when no default is present", () => {
        const rows = formatMembers([{ kind: "prop", name: "x" }], "prop");
        expect(rows[0][3]).toBe("");
    });
});
