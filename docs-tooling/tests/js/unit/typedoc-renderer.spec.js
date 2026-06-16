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

const payloadWithTypes = {
    name: "vueda",
    children: [
        {
            id: 1,
            name: "theme",
            kind: 2,
            children: [
                {
                    id: 2,
                    name: "SpotName",
                    kind: 2097152,
                    comment: { summary: [{ kind: "text", text: "The unique name of a spot." }] },
                    type: { type: "intrinsic", name: "string" },
                    sources: [{ fileName: "client/lib/theme.js", line: 5 }],
                },
                {
                    id: 3,
                    name: "ComponentConfig",
                    kind: 2097152,
                    comment: { summary: [{ kind: "text", text: "Config for a component." }] },
                    type: {
                        type: "reflection",
                        declaration: {
                            id: 4,
                            kind: 65536,
                            children: [
                                {
                                    id: 5,
                                    name: "defaultVariant",
                                    kind: 1024,
                                    type: { type: "reference", name: "VariantName" },
                                },
                            ],
                        },
                    },
                    sources: [{ fileName: "client/lib/theme.js", line: 10 }],
                },
            ],
        },
    ],
};

describe("renderTypeDocBundle with type aliases", () => {
    function buildOutputsWithTypes() {
        const bundle = new TypeDocNormalizer().normalize(payloadWithTypes);
        return renderTypeDocBundle(bundle);
    }

    it("simple type alias page renders a Type section", () => {
        const outputs = buildOutputsWithTypes();
        const page = outputs.get("js/theme/types/SpotName.md");
        expect(page).toBeDefined();
        expect(page).toContain("## Type");
        expect(page).toContain("SpotName = string");
    });

    it("object reflection type page renders a Properties section", () => {
        const outputs = buildOutputsWithTypes();
        const page = outputs.get("js/theme/types/ComponentConfig.md");
        expect(page).toBeDefined();
        expect(page).toContain("## Properties");
        expect(page).toContain("defaultVariant");
        expect(page).toContain("VariantName");
    });

    it("module page renders types inline with a heading per type", () => {
        const outputs = buildOutputsWithTypes();
        const page = outputs.get("js/theme.md");
        expect(page).toBeDefined();
        expect(page).toContain("### [SpotName]");
        expect(page).toContain("### [ComponentConfig]");
    });

    it("module page shows type definition inline for simple alias", () => {
        const outputs = buildOutputsWithTypes();
        const page = outputs.get("js/theme.md");
        expect(page).toContain("SpotName = string");
    });

    it("module page shows properties table inline for object reflection type", () => {
        const outputs = buildOutputsWithTypes();
        const page = outputs.get("js/theme.md");
        expect(page).toContain("defaultVariant");
        expect(page).toContain("VariantName");
    });
});

const payloadWithLinkedReturn = {
    name: "vueda",
    children: [
        {
            id: 1,
            name: "math",
            kind: 2,
            children: [
                {
                    id: 10,
                    name: "Result",
                    kind: 256,
                    comment: { summary: [{ kind: "text", text: "A result object." }] },
                    children: [],
                    sources: [{ fileName: "client/lib/math.js", line: 1 }],
                },
                {
                    id: 11,
                    name: "compute",
                    kind: 64,
                    comment: { summary: [{ kind: "text", text: "Compute something." }] },
                    signatures: [
                        {
                            id: 12,
                            name: "compute",
                            parameters: [],
                            type: { type: "reference", target: 10, name: "Result" },
                        },
                    ],
                    sources: [{ fileName: "client/lib/math.js", line: 5 }],
                },
            ],
        },
    ],
};

describe("renderTypeDocBundle with linked return type", () => {
    function buildOutputsWithLinkedReturn() {
        const bundle = new TypeDocNormalizer().normalize(payloadWithLinkedReturn);
        return renderTypeDocBundle(bundle);
    }

    it("renders return type as a link when typeRef has a resolved link", () => {
        const outputs = buildOutputsWithLinkedReturn();
        const page = outputs.get("js/math/functions/compute.md");
        expect(page).toBeDefined();
        expect(page).toContain("[Result](");
        expect(page).toContain("../types/Result.md");
    });

    it("renders return type as inline code when typeRef has no link", () => {
        const payloadIntrinsic = {
            name: "vueda",
            children: [
                {
                    id: 1,
                    name: "math",
                    kind: 2,
                    children: [
                        {
                            id: 2,
                            name: "echo",
                            kind: 64,
                            comment: { summary: [{ kind: "text", text: "Echo a string." }] },
                            signatures: [
                                {
                                    id: 3,
                                    name: "echo",
                                    parameters: [],
                                    type: { type: "intrinsic", name: "string" },
                                },
                            ],
                            sources: [{ fileName: "client/lib/math.js", line: 20 }],
                        },
                    ],
                },
            ],
        };
        const bundle = new TypeDocNormalizer().normalize(payloadIntrinsic);
        const outputs = renderTypeDocBundle(bundle);
        const page = outputs.get("js/math/functions/echo.md");
        expect(page).toBeDefined();
        expect(page).toContain("`string`");
        expect(page).not.toContain("[string](");
    });
});

const payloadWithLinkedParam = {
    name: "vueda",
    children: [
        {
            id: 1,
            name: "widgets",
            kind: 2,
            children: [
                {
                    id: 20,
                    name: "Config",
                    kind: 256,
                    comment: { summary: [{ kind: "text", text: "Configuration interface." }] },
                    children: [],
                    sources: [{ fileName: "client/lib/widgets.js", line: 1 }],
                },
                {
                    id: 21,
                    name: "create",
                    kind: 64,
                    comment: { summary: [{ kind: "text", text: "Create a widget." }] },
                    signatures: [
                        {
                            id: 22,
                            name: "create",
                            parameters: [
                                {
                                    id: 23,
                                    name: "config",
                                    flags: {},
                                    type: { type: "reference", target: 20, name: "Config" },
                                },
                            ],
                            type: { type: "intrinsic", name: "void" },
                        },
                    ],
                    sources: [{ fileName: "client/lib/widgets.js", line: 10 }],
                },
            ],
        },
    ],
};

describe("renderTypeDocBundle with linked parameter type", () => {
    function buildOutputsWithLinkedParam() {
        const bundle = new TypeDocNormalizer().normalize(payloadWithLinkedParam);
        return renderTypeDocBundle(bundle);
    }

    it("renders parameter type as a link when typeRef has a resolved link", () => {
        const outputs = buildOutputsWithLinkedParam();
        const page = outputs.get("js/widgets/functions/create.md");
        expect(page).toBeDefined();
        expect(page).toContain("[Config](");
        expect(page).toContain("../types/Config.md");
    });

    it("renders parameter type as inline code when typeRef has no link", () => {
        const payloadIntrinsicParam = {
            name: "vueda",
            children: [
                {
                    id: 1,
                    name: "widgets",
                    kind: 2,
                    children: [
                        {
                            id: 2,
                            name: "scale",
                            kind: 64,
                            comment: { summary: [{ kind: "text", text: "Scale a value." }] },
                            signatures: [
                                {
                                    id: 3,
                                    name: "scale",
                                    parameters: [
                                        { id: 4, name: "n", flags: {}, type: { type: "intrinsic", name: "number" } },
                                    ],
                                    type: { type: "intrinsic", name: "number" },
                                },
                            ],
                            sources: [{ fileName: "client/lib/widgets.js", line: 20 }],
                        },
                    ],
                },
            ],
        };
        const bundle = new TypeDocNormalizer().normalize(payloadIntrinsicParam);
        const outputs = renderTypeDocBundle(bundle);
        const page = outputs.get("js/widgets/functions/scale.md");
        expect(page).toBeDefined();
        expect(page).toContain("`number`");
        expect(page).not.toContain("[number](");
    });
});

const payloadWithProperty = {
    name: "vueda",
    children: [
        {
            id: 1,
            name: "forms",
            kind: 2,
            children: [
                {
                    id: 2,
                    name: "clearErrors",
                    kind: 1024,
                    comment: { summary: [{ kind: "text", text: "Clears all form errors." }] },
                    type: { type: "intrinsic", name: "boolean" },
                    sources: [{ fileName: "client/lib/forms.js", line: 3 }],
                },
            ],
        },
    ],
};

const payloadWithCallableProperty = {
    name: "vueda",
    children: [
        {
            id: 1,
            name: "forms",
            kind: 2,
            children: [
                {
                    id: 2,
                    name: "clearErrors",
                    kind: 1024,
                    comment: { summary: [{ kind: "text", text: "Clears all errors associated with this field." }] },
                    type: {
                        type: "reflection",
                        declaration: {
                            kind: 65536,
                            signatures: [
                                {
                                    kind: 4096,
                                    parameters: [
                                        {
                                            name: "childIndex",
                                            flags: {},
                                            type: { type: "intrinsic", name: "number" },
                                        },
                                    ],
                                    type: { type: "intrinsic", name: "void" },
                                },
                            ],
                        },
                    },
                    sources: [{ fileName: "client/lib/forms.js", line: 3 }],
                },
            ],
        },
    ],
};

describe("renderTypeDocBundle with callable property type hints", () => {
    function buildOutputsWithCallableProperty() {
        const bundle = new TypeDocNormalizer().normalize(payloadWithCallableProperty);
        return renderTypeDocBundle(bundle);
    }

    it("module page shows function signature type hint in child listing", () => {
        const outputs = buildOutputsWithCallableProperty();
        const page = outputs.get("js/forms.md");
        expect(page).toBeDefined();
        expect(page).toContain("`(childIndex: number) => void`");
    });

    it("module page includes both type hint and description in child listing", () => {
        const outputs = buildOutputsWithCallableProperty();
        const page = outputs.get("js/forms.md");
        expect(page).toContain("`(childIndex: number) => void`");
        expect(page).toContain("Clears all errors associated with this field.");
    });
});

describe("renderTypeDocBundle with property nodes", () => {
    function buildOutputsWithProperty() {
        const bundle = new TypeDocNormalizer().normalize(payloadWithProperty);
        return renderTypeDocBundle(bundle);
    }

    it("does not emit a standalone property page", () => {
        const outputs = buildOutputsWithProperty();
        expect(outputs.has("js/forms/properties/clearErrors.md")).toBe(false);
    });

    it("module page frontmatter exposes the property id as an inlined member", () => {
        const outputs = buildOutputsWithProperty();
        const page = outputs.get("js/forms.md");
        expect(page).toBeDefined();
        expect(page).toContain("member_ids");
        expect(page).toContain("js:property:vueda/forms#clearErrors");
    });

    it("module page renders property details under a stable anchor", () => {
        const outputs = buildOutputsWithProperty();
        const page = outputs.get("js/forms.md");
        expect(page).toContain("### clearErrors {#clearErrors}");
        expect(page).toContain("Clears all form errors.");
        expect(page).toContain("Type: `boolean`");
        const headingPos = page.indexOf("### clearErrors");
        const typePos = page.indexOf("Type: `boolean`");
        expect(typePos).toBeGreaterThan(headingPos);
    });
});
