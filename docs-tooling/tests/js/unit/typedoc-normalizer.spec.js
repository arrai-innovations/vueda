import { TypeDocNormalizer } from "../../../js/normalizers/typedoc.js";
import { assertCanonical } from "../../../js/utils/validate-canonical.js";
import { describe, expect, it } from "vitest";

describe("TypeDocNormalizer", () => {
    it("produces canonical output that validates against the schema", async () => {
        const normalizer = new TypeDocNormalizer();
        const payload = {
            name: "vueda",
            children: [
                {
                    id: 1,
                    name: "math",
                    kind: 2,
                    children: [
                        {
                            id: 2,
                            name: "sum",
                            kind: 64,
                            comment: {
                                summary: [{ kind: "text", text: "Add two numbers." }],
                            },
                            signatures: [
                                {
                                    id: 3,
                                    name: "sum",
                                    parameters: [
                                        {
                                            id: 4,
                                            name: "a",
                                            flags: {},
                                            type: { type: "intrinsic", name: "number" },
                                        },
                                        {
                                            id: 5,
                                            name: "b",
                                            flags: {},
                                            type: { type: "intrinsic", name: "number" },
                                        },
                                    ],
                                    type: { type: "intrinsic", name: "number" },
                                },
                            ],
                            sources: [
                                {
                                    fileName: "client/lib/math.js",
                                    line: 1,
                                    url: "https://example.test/math.js#L1",
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        const output = normalizer.normalize(payload);

        await assertCanonical(output);

        expect(output.source).toBe("typedoc");
        expect(output.roots.length).toBe(1);
        expect(output.nodes.some((node) => node.kind === "function")).toBe(true);
    });

    it("extracts @example from signature blockTags onto the node", async () => {
        const normalizer = new TypeDocNormalizer();
        const payload = {
            name: "vueda",
            children: [
                {
                    id: 1,
                    name: "utils",
                    kind: 2,
                    children: [
                        {
                            id: 2,
                            name: "greet",
                            kind: 64,
                            comment: { summary: [{ kind: "text", text: "Say hello." }] },
                            signatures: [
                                {
                                    id: 3,
                                    name: "greet",
                                    parameters: [],
                                    type: { type: "intrinsic", name: "string" },
                                    comment: {
                                        blockTags: [
                                            {
                                                tag: "@example",
                                                content: [
                                                    {
                                                        kind: "code",
                                                        text: "```js\ngreet();\n// => 'Hello'\n```",
                                                    },
                                                ],
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

        const output = normalizer.normalize(payload);
        await assertCanonical(output);

        const fnNode = output.nodes.find((n) => n.name === "greet");
        expect(fnNode.examples).toBeDefined();
        expect(fnNode.examples).toHaveLength(1);
        expect(fnNode.examples[0].lang).toBe("js");
        expect(fnNode.examples[0].content).toContain("greet()");
    });

    it("extracts @returns description text onto returns.description", async () => {
        const normalizer = new TypeDocNormalizer();
        const payload = {
            name: "vueda",
            children: [
                {
                    id: 1,
                    name: "math",
                    kind: 2,
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
                                    parameters: [],
                                    type: { type: "intrinsic", name: "number" },
                                    comment: {
                                        blockTags: [
                                            {
                                                tag: "@returns",
                                                content: [{ kind: "text", text: "The sum of a and b." }],
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

        const output = normalizer.normalize(payload);
        await assertCanonical(output);

        const fnNode = output.nodes.find((n) => n.name === "sum");
        const sig = fnNode.signatures[0];
        expect(sig.returns.name).toBe("number");
        expect(sig.returns.description).toBe("The sum of a and b.");
    });

    it("uses @returns text as name when return type is a reflection (object)", async () => {
        const normalizer = new TypeDocNormalizer();
        const payload = {
            name: "vueda",
            children: [
                {
                    id: 1,
                    name: "utils",
                    kind: 2,
                    children: [
                        {
                            id: 2,
                            name: "makeConfig",
                            kind: 64,
                            comment: { summary: [{ kind: "text", text: "Build a config." }] },
                            signatures: [
                                {
                                    id: 3,
                                    name: "makeConfig",
                                    parameters: [],
                                    type: { type: "reflection", declaration: {} },
                                    comment: {
                                        blockTags: [
                                            {
                                                tag: "@returns",
                                                content: [{ kind: "text", text: "A config object." }],
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

        const output = normalizer.normalize(payload);
        await assertCanonical(output);

        const fnNode = output.nodes.find((n) => n.name === "makeConfig");
        const sig = fnNode.signatures[0];
        expect(sig.returns.name).toBe("A config object.");
        expect(sig.returns.description).toBeUndefined();
    });

    it("extracts @description blockTag as module description", async () => {
        const normalizer = new TypeDocNormalizer();
        const payload = {
            name: "vueda",
            children: [
                {
                    id: 1,
                    name: "myModule",
                    kind: 2,
                    comment: {
                        summary: [],
                        blockTags: [
                            {
                                tag: "@description",
                                content: [{ kind: "text", text: "Utilities for myModule." }],
                            },
                        ],
                    },
                    children: [],
                },
            ],
        };

        const output = normalizer.normalize(payload);
        await assertCanonical(output);

        const modNode = output.nodes.find((n) => n.name === "myModule");
        expect(modNode.description).toBe("Utilities for myModule.");
    });

    it("falls back to signature comment for function description", async () => {
        const normalizer = new TypeDocNormalizer();
        const payload = {
            name: "vueda",
            children: [
                {
                    id: 1,
                    name: "utils",
                    kind: 2,
                    children: [
                        {
                            id: 2,
                            name: "compute",
                            kind: 64,
                            signatures: [
                                {
                                    id: 3,
                                    name: "compute",
                                    parameters: [],
                                    type: { type: "intrinsic", name: "void" },
                                    comment: {
                                        summary: [{ kind: "text", text: "Runs the computation." }],
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        const output = normalizer.normalize(payload);
        await assertCanonical(output);

        const fnNode = output.nodes.find((n) => n.name === "compute");
        expect(fnNode.description).toBe("Runs the computation.");
    });

    it("extracts @example from node-level blockTags", async () => {
        const normalizer = new TypeDocNormalizer();
        const payload = {
            name: "vueda",
            children: [
                {
                    id: 1,
                    name: "utils",
                    kind: 2,
                    children: [
                        {
                            id: 2,
                            name: "PI",
                            kind: 32,
                            comment: {
                                summary: [{ kind: "text", text: "The value of pi." }],
                                blockTags: [
                                    {
                                        tag: "@example",
                                        content: [{ kind: "code", text: "```js\nconsole.log(PI);\n```" }],
                                    },
                                ],
                            },
                        },
                    ],
                },
            ],
        };

        const output = normalizer.normalize(payload);
        await assertCanonical(output);

        const varNode = output.nodes.find((n) => n.name === "PI");
        expect(varNode.examples).toBeDefined();
        expect(varNode.examples[0].lang).toBe("js");
        expect(varNode.examples[0].content).toContain("console.log(PI)");
    });

    it("captures typeDefinition for a simple type alias (intrinsic)", async () => {
        const normalizer = new TypeDocNormalizer();
        const payload = {
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
                        },
                    ],
                },
            ],
        };

        const output = normalizer.normalize(payload);
        await assertCanonical(output);

        const typeNode = output.nodes.find((n) => n.name === "SpotName");
        expect(typeNode.kind).toBe("type");
        expect(typeNode.typeDefinition).toBeDefined();
        expect(typeNode.typeDefinition.name).toBe("string");
        expect(typeNode.members).toBeUndefined();
    });

    it("sets link on typeRef when return type references a known declaration", async () => {
        const normalizer = new TypeDocNormalizer();
        const payload = {
            name: "vueda",
            children: [
                {
                    id: 1,
                    name: "api",
                    kind: 2,
                    children: [
                        {
                            id: 10,
                            name: "ResultType",
                            kind: 256,
                            comment: { summary: [{ kind: "text", text: "The result type." }] },
                        },
                        {
                            id: 11,
                            name: "getResult",
                            kind: 64,
                            comment: { summary: [{ kind: "text", text: "Get a result." }] },
                            signatures: [
                                {
                                    id: 12,
                                    name: "getResult",
                                    parameters: [],
                                    type: { type: "reference", target: 10, name: "ResultType" },
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        const output = normalizer.normalize(payload);
        await assertCanonical(output);

        const fnNode = output.nodes.find((n) => n.name === "getResult");
        const returns = fnNode.signatures[0].returns;
        expect(returns.name).toBe("ResultType");
        expect(returns.link).toBe("js:interface:vueda/api#ResultType");
    });

    it("omits link on typeRef when reference id is not in the map", async () => {
        const normalizer = new TypeDocNormalizer();
        const payload = {
            name: "vueda",
            children: [
                {
                    id: 1,
                    name: "api",
                    kind: 2,
                    children: [
                        {
                            id: 20,
                            name: "fetchData",
                            kind: 64,
                            comment: { summary: [{ kind: "text", text: "Fetch some data." }] },
                            signatures: [
                                {
                                    id: 21,
                                    name: "fetchData",
                                    parameters: [],
                                    type: { type: "reference", target: 999, name: "ExternalType" },
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        const output = normalizer.normalize(payload);
        await assertCanonical(output);

        const fnNode = output.nodes.find((n) => n.name === "fetchData");
        const returns = fnNode.signatures[0].returns;
        expect(returns.name).toBe("ExternalType");
        expect(returns.link).toBeUndefined();
    });

    it("captures propertyType for a property node with an intrinsic type", async () => {
        const normalizer = new TypeDocNormalizer();
        const payload = {
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
                        },
                    ],
                },
            ],
        };

        const output = normalizer.normalize(payload);
        await assertCanonical(output);

        const propNode = output.nodes.find((n) => n.name === "clearErrors");
        expect(propNode.kind).toBe("property");
        expect(propNode.propertyType).toBeDefined();
        expect(propNode.propertyType.name).toBe("boolean");
        expect(propNode.typeDefinition).toBeUndefined();
    });

    it("produces a function signature string for a callable reflection property", async () => {
        const normalizer = new TypeDocNormalizer();
        const payload = {
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
                            comment: {
                                summary: [{ kind: "text", text: "Clears all errors associated with this field." }],
                            },
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
                        },
                    ],
                },
            ],
        };

        const output = normalizer.normalize(payload);
        await assertCanonical(output);

        const propNode = output.nodes.find((n) => n.name === "clearErrors");
        expect(propNode.kind).toBe("property");
        expect(propNode.propertyType).toBeDefined();
        expect(propNode.propertyType.name).toBe("(childIndex: number) => void");
    });

    it("captures members for a type alias with an object reflection shape", async () => {
        const normalizer = new TypeDocNormalizer();
        const payload = {
            name: "vueda",
            children: [
                {
                    id: 1,
                    name: "theme",
                    kind: 2,
                    children: [
                        {
                            id: 2,
                            name: "ComponentConfig",
                            kind: 2097152,
                            comment: { summary: [{ kind: "text", text: "Config for a component." }] },
                            type: {
                                type: "reflection",
                                declaration: {
                                    id: 3,
                                    kind: 65536,
                                    children: [
                                        {
                                            id: 4,
                                            name: "defaultVariant",
                                            kind: 1024,
                                            type: { type: "reference", name: "VariantName" },
                                        },
                                        {
                                            id: 5,
                                            name: "spots",
                                            kind: 1024,
                                            type: {
                                                type: "array",
                                                elementType: { type: "reference", name: "SpotName" },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                },
            ],
        };

        const output = normalizer.normalize(payload);
        await assertCanonical(output);

        const typeNode = output.nodes.find((n) => n.name === "ComponentConfig");
        expect(typeNode.kind).toBe("type");
        expect(typeNode.members).toBeDefined();
        expect(typeNode.members).toHaveLength(2);
        expect(typeNode.members[0].name).toBe("defaultVariant");
        expect(typeNode.members[0].type.name).toBe("VariantName");
        expect(typeNode.members[1].name).toBe("spots");
        expect(typeNode.members[1].type.name).toBe("SpotName[]");
        expect(typeNode.typeDefinition).toBeUndefined();
    });
});
