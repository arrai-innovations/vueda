import { TypeDocNormalizer } from "../../../js/normalizers/typedoc.js";
import { renderTypeDocBundle } from "../../../js/renderers/typedoc.js";
import { describe, expect, it } from "vitest";

const payload = {
    name: "vueda",
    children: [
        {
            id: 1,
            name: "math",
            kind: 2,
            comment: { summary: [{ kind: "text", text: "Math utilities." }] },
            children: [
                {
                    id: 2,
                    name: "sum",
                    kind: 64,
                    comment: { summary: [{ kind: "text", text: "Add two numbers." }] },
                    signatures: [
                        {
                            id: 3,
                            name: "sum",
                            parameters: [
                                { id: 4, name: "a", flags: {}, type: { type: "intrinsic", name: "number" } },
                                { id: 5, name: "b", flags: {}, type: { type: "intrinsic", name: "number" } },
                            ],
                            type: { type: "intrinsic", name: "number" },
                        },
                    ],
                    sources: [{ fileName: "client/lib/math.js", line: 1 }],
                },
            ],
        },
    ],
};

const payloadWithExamples = {
    name: "vueda",
    children: [
        {
            id: 1,
            name: "strings",
            kind: 2,
            children: [
                {
                    id: 2,
                    name: "shout",
                    kind: 64,
                    comment: { summary: [{ kind: "text", text: "Uppercases a string." }] },
                    signatures: [
                        {
                            id: 3,
                            name: "shout",
                            parameters: [{ id: 4, name: "s", flags: {}, type: { type: "intrinsic", name: "string" } }],
                            type: { type: "intrinsic", name: "string" },
                            comment: {
                                blockTags: [
                                    {
                                        tag: "@example",
                                        content: [{ kind: "code", text: "```js\nshout('hello');\n// => 'HELLO'\n```" }],
                                    },
                                ],
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

function buildOutputs() {
    const bundle = new TypeDocNormalizer().normalize(payload);
    return renderTypeDocBundle(bundle);
}

describe("renderTypeDocBundle", () => {
    it("produces output entries only for file paths without # anchors", () => {
        const outputs = buildOutputs();
        for (const filePath of outputs.keys()) {
            expect(filePath).not.toContain("#");
        }
    });

    it("includes a page for the module and one for the function", () => {
        const outputs = buildOutputs();
        const keys = [...outputs.keys()];
        expect(keys.some((k) => k === "js/math.md")).toBe(true);
        expect(keys.some((k) => k === "js/math/functions/sum.md")).toBe(true);
    });

    it("module page contains a heading for the module name", () => {
        const outputs = buildOutputs();
        const page = outputs.get("js/math.md");
        expect(page).toBeDefined();
        expect(page).toContain("# math");
    });

    it("function page contains the function name in a heading", () => {
        const outputs = buildOutputs();
        const page = outputs.get("js/math/functions/sum.md");
        expect(page).toBeDefined();
        expect(page).toContain("sum");
    });

    it("function page renders the parameter names", () => {
        const outputs = buildOutputs();
        const page = outputs.get("js/math/functions/sum.md");
        expect(page).toContain("a");
        expect(page).toContain("b");
    });

    it("function page renders the return type", () => {
        const outputs = buildOutputs();
        const page = outputs.get("js/math/functions/sum.md");
        expect(page).toContain("number");
    });

    it("each page frontmatter includes id, kind, and source fields", () => {
        const outputs = buildOutputs();
        for (const content of outputs.values()) {
            expect(content).toContain("id:");
            expect(content).toContain("kind:");
            expect(content).toContain('source: "typedoc"');
        }
    });

    it("module page annotates child links with descriptions when available", () => {
        const outputs = buildOutputs();
        const page = outputs.get("js/math.md");
        // sum has a description "Add two numbers." which should appear on the module index
        expect(page).toContain("Add two numbers.");
    });
});

describe("renderTypeDocBundle with returns description", () => {
    const payloadWithReturnsDesc = {
        name: "vueda",
        children: [
            {
                id: 1,
                name: "math",
                kind: 2,
                children: [
                    {
                        id: 2,
                        name: "double",
                        kind: 64,
                        comment: { summary: [{ kind: "text", text: "Double a number." }] },
                        signatures: [
                            {
                                id: 3,
                                name: "double",
                                parameters: [
                                    { id: 4, name: "n", flags: {}, type: { type: "intrinsic", name: "number" } },
                                ],
                                type: { type: "intrinsic", name: "number" },
                                comment: {
                                    blockTags: [
                                        {
                                            tag: "@returns",
                                            content: [{ kind: "text", text: "The doubled value." }],
                                        },
                                    ],
                                },
                            },
                        ],
                        sources: [{ fileName: "client/lib/math.js", line: 10 }],
                    },
                ],
            },
        ],
    };

    function buildOutputsWithReturnsDesc() {
        const bundle = new TypeDocNormalizer().normalize(payloadWithReturnsDesc);
        return renderTypeDocBundle(bundle);
    }

    it("function page renders the @returns description text", () => {
        const outputs = buildOutputsWithReturnsDesc();
        const page = outputs.get("js/math/functions/double.md");
        expect(page).toBeDefined();
        expect(page).toContain("The doubled value.");
    });

    it("returns description appears after the return type name", () => {
        const outputs = buildOutputsWithReturnsDesc();
        const page = outputs.get("js/math/functions/double.md");
        const typePos = page.indexOf("`number`");
        const descPos = page.indexOf("The doubled value.");
        expect(typePos).toBeGreaterThan(-1);
        expect(descPos).toBeGreaterThan(typePos);
    });
});

describe("renderTypeDocBundle with examples", () => {
    function buildOutputsWithExamples() {
        const bundle = new TypeDocNormalizer().normalize(payloadWithExamples);
        return renderTypeDocBundle(bundle);
    }

    it("function page renders an Examples heading when @example is present", () => {
        const outputs = buildOutputsWithExamples();
        const page = outputs.get("js/strings/functions/shout.md");
        expect(page).toBeDefined();
        expect(page).toContain("## Examples");
    });

    it("function page renders the example code block with language tag", () => {
        const outputs = buildOutputsWithExamples();
        const page = outputs.get("js/strings/functions/shout.md");
        expect(page).toContain("```js");
        expect(page).toContain("shout('hello')");
    });

    it("Examples section appears after Signature section", () => {
        const outputs = buildOutputsWithExamples();
        const page = outputs.get("js/strings/functions/shout.md");
        const sigPos = page.indexOf("## Signature");
        const exPos = page.indexOf("## Examples");
        expect(sigPos).toBeGreaterThan(-1);
        expect(exPos).toBeGreaterThan(sigPos);
    });
});
