import commentMaxLength, { classifyLines, rewrapParagraph, tokenize } from "../../../js/eslint/comment-max-length.js";
import { RuleTester } from "eslint";
import { afterAll, describe, expect, it } from "vitest";
import vueParser from "vue-eslint-parser";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: "latest", sourceType: "module" } });
const options = [{ max: 40 }];
const lines = (...items) => items.join("\n");

describe("tokenize", () => {
    it("splits on whitespace but keeps code spans and brace groups whole", () => {
        expect(tokenize("see {@link Foo bar} and `a b` {x: 1} end")).toEqual([
            "see",
            "{@link Foo bar}",
            "and",
            "`a b`",
            "{x: 1}",
            "end",
        ]);
    });
});

describe("classifyLines", () => {
    it("starts a paragraph at each tag and list item and keeps fences and examples verbatim", () => {
        const kinds = classifyLines([
            "Text",
            "more",
            "",
            "- item",
            "  more",
            "```js",
            "code",
            "```",
            "@param {x} a - b",
            "c",
            "@example",
            "example()",
            "@returns {y}",
        ]);
        expect(kinds.map((kind) => kind.paragraph)).toEqual([0, 0, -1, 3, 3, -1, -1, -1, 8, 8, -1, -1, 12]);
    });
});

describe("rewrapParagraph", () => {
    it("returns null when the long line is a single token", () => {
        expect(rewrapParagraph(["https://example.com/a/very/long/path"], 0, 10)).toBeNull();
    });
});

ruleTester.run("comment-max-length", commentMaxLength, {
    valid: [
        { code: "// a short comment\nconst a = 1;", options },
        { code: "/** A short JSDoc comment. */\nconst a = 1;", options },
        { code: "// https://example.com/a/very/long/path/that/cannot/wrap\nconst a = 1;", options },
        {
            code: "// eslint-disable-next-line no-unused-vars -- a reason that runs long\nconst a = 1;",
            options,
        },
        {
            code: lines(
                "/**",
                " * Text.",
                " *",
                " * ```js",
                " * const value = someFunction(argumentOne, argumentTwo);",
                " * ```",
                " */",
            ),
            options,
        },
        {
            code: lines(
                "/**",
                " * Text.",
                " * @example",
                " * const value = someFunction(argumentOne, argumentTwo);",
                " */",
            ),
            options,
        },
        {
            code: lines("/**", " * | Column one heading | Column two heading |", " */"),
            options,
        },
        {
            code: "/** @type {import('vue').Ref<Record<string, number>>} */\nconst a = 1;",
            options,
        },
        {
            code: "// This comment is a little longer than forty characters.\nconst a = 1;",
            options: [{ max: 120 }],
        },
    ],
    invalid: [
        {
            name: "expands a one-line JSDoc comment",
            code: lines(
                "const props = {",
                "    /** The name of the field that this prop sets. */",
                "    name: String,",
                "};",
            ),
            output: lines(
                "const props = {",
                "    /**",
                "     * The name of the field that this",
                "     * prop sets.",
                "     */",
                "    name: String,",
                "};",
            ),
            options,
            errors: [{ messageId: "tooLong", line: 2 }],
        },
        {
            name: "rewraps from the long line to the end of its paragraph only",
            code: lines(
                "/**",
                " * Short first line.",
                " * This second line is long enough to overflow the limit.",
                " * End.",
                " *",
                " * Next paragraph.",
                " */",
            ),
            output: lines(
                "/**",
                " * Short first line.",
                " * This second line is long enough to",
                " * overflow the limit. End.",
                " *",
                " * Next paragraph.",
                " */",
            ),
            options,
            errors: [{ messageId: "tooLong", line: 3 }],
        },
        {
            name: "rewraps every over-long paragraph of a block in one pass",
            code: lines(
                "/**",
                " * @param {string} a - The first parameter of the call.",
                " * @param {string} b - Short.",
                " * @param {string} c - The third parameter of the call.",
                " */",
            ),
            output: lines(
                "/**",
                " * @param {string} a - The first",
                " *  parameter of the call.",
                " * @param {string} b - Short.",
                " * @param {string} c - The third",
                " *  parameter of the call.",
                " */",
            ),
            options,
            errors: [{ messageId: "tooLong", line: 2 }],
        },
        {
            name: "keeps a tag head together and indents its continuation",
            code: lines("/**", " * @param {string} fieldName - The field that the value belongs to.", " */"),
            output: lines("/**", " * @param {string} fieldName - The field", " *  that the value belongs to.", " */"),
            options,
            errors: [{ messageId: "tooLong", line: 2 }],
        },
        {
            name: "aligns list continuations under the item text",
            code: lines("/**", " * - The first item in this list runs long.", " */"),
            output: lines("/**", " * - The first item in this list runs", " *   long.", " */"),
            options,
            errors: [{ messageId: "tooLong", line: 2 }],
        },
        {
            name: "never starts a line with a token that changes the line's meaning",
            code: lines("/**", " * Install the helpers from abcdefghij @scope/pkg first.", " */"),
            output: lines("/**", " * Install the helpers from", " * abcdefghij @scope/pkg first.", " */"),
            options,
            errors: [{ messageId: "tooLong", line: 2 }],
        },
        {
            name: "does not split inline tags or code spans",
            code: lines("/**", " * Calls it with {@link Foo the foo} and `a b c` now.", " */"),
            output: lines("/**", " * Calls it with {@link Foo the foo} and", " * `a b c` now.", " */"),
            options,
            errors: [{ messageId: "tooLong", line: 2 }],
        },
        {
            name: "rewraps a run of line comments",
            code: lines("    // This line comment is long enough to wrap.", "    // Next.", "    const a = 1;"),
            output: lines("    // This line comment is long enough", "    // to wrap. Next.", "    const a = 1;"),
            options,
            errors: [{ messageId: "tooLong", line: 1 }],
        },
        {
            name: "reports a trailing comment without a fix",
            code: "const value = 1; // a trailing comment that is long",
            output: null,
            options,
            errors: [{ messageId: "tooLong", line: 1 }],
        },
        {
            name: "reports a block comment whose text shares the closing line without a fix",
            code: lines("/**", " * Text that runs past the limit on the closing line. */", "const a = 1;"),
            output: null,
            options,
            errors: [{ messageId: "tooLong", line: 2 }],
        },
    ],
});

const vueTester = new RuleTester({
    languageOptions: { parser: vueParser, ecmaVersion: "latest", sourceType: "module" },
});

vueTester.run("comment-max-length (Vue SFC)", commentMaxLength, {
    valid: [],
    invalid: [
        {
            filename: "Component.vue",
            code: lines(
                "<template><div /></template>",
                "<script setup>",
                "/** A component that does one thing well. */",
                "defineOptions({});",
                "</script>",
            ),
            output: lines(
                "<template><div /></template>",
                "<script setup>",
                "/**",
                " * A component that does one thing well.",
                " */",
                "defineOptions({});",
                "</script>",
            ),
            options,
            errors: [{ messageId: "tooLong", line: 3 }],
        },
    ],
});
