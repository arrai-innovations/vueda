import {
    VueDocgenNormalizer,
    extractScriptBlock,
    findCalledIdentifiers,
    findComponentTagValues,
    findImportPath,
    findSpreadIdentifiersInCall,
    parseSlotConstant,
    parseSpreadConstant,
    parseSpreadFunctionAnnotation,
    resolveVuedaPath,
} from "../../../js/normalizers/vue-docgen-api.js";
import { assertCanonical } from "../../../js/utils/validate-canonical.js";
import { describe, expect, it } from "vitest";

describe("VueDocgenNormalizer", () => {
    it("produces canonical output that validates against the schema", async () => {
        const normalizer = new VueDocgenNormalizer();
        const payload = {
            sourceDir: "client/lib",
            files: [
                {
                    filePath: "client/lib/components/Foo.vue",
                    components: [
                        {
                            displayName: "Foo",
                            description: "Test component",
                            props: [
                                {
                                    name: "bar",
                                    description: "Bar prop",
                                    type: { name: "string" },
                                    required: true,
                                    defaultValue: { value: "'x'" },
                                },
                            ],
                            slots: [
                                {
                                    name: "default",
                                    scoped: false,
                                    bindings: [{ name: "value" }],
                                },
                            ],
                            events: [{ name: "submit", description: "When submitted" }],
                            tags: {},
                            sourceFiles: ["/abs/path/Foo.vue"],
                        },
                    ],
                },
            ],
        };

        const output = normalizer.normalize(payload);

        await assertCanonical(output);

        expect(output.source).toBe("vue-docgen");
        expect(output.roots).toEqual(["vue:component:Foo"]);
        expect(output.nodes.some((node) => node.kind === "slot")).toBe(true);
        expect(output.nodes.some((node) => node.kind === "event")).toBe(true);
    });

    it("maps @deprecated component tags to canonical lifecycle metadata", async () => {
        const normalizer = new VueDocgenNormalizer();
        const payload = componentPayload("client/lib/components/TestComp.vue", {
            description: "Legacy component.",
            tags: {
                deprecated: [
                    {
                        title: "deprecated",
                        description: "Use {@api vue:component:ReplacementComp} instead.",
                    },
                ],
            },
        });

        const output = normalizer.normalize(payload);

        await assertCanonical(output);

        const comp = output.nodes.find((node) => node.kind === "component");
        expect(comp.lifecycle).toEqual({
            status: "deprecated",
            description: "Use {@api vue:component:ReplacementComp} instead.",
        });
    });
});

// ---------------------------------------------------------------------------
// Helper: build a VueDocgenNormalizer with a map of path -> source content
// ---------------------------------------------------------------------------

function makeNormalizerWithFiles(fileMap, repoRoot = "/fake") {
    return new VueDocgenNormalizer({
        repoRoot,
        fileResolver: (filePath) => {
            if (filePath in fileMap) return fileMap[filePath];
            throw new Error(`Unexpected file read: ${filePath}`);
        },
    });
}

function componentPayload(filePath, overrides = {}) {
    return {
        sourceDir: "client/lib",
        files: [
            {
                filePath,
                components: [
                    {
                        displayName: "TestComp",
                        props: [],
                        events: [],
                        slots: [],
                        ...overrides,
                    },
                ],
            },
        ],
    };
}

// ---------------------------------------------------------------------------
// Spread props injection
// ---------------------------------------------------------------------------

describe("VueDocgenNormalizer — spread props", () => {
    const COMP_PATH = "/fake/client/lib/components/TestComp.vue";
    const CONST_PATH = "/fake/client/lib/use/useTest.js";

    const compSource = `
<script setup>
import { TEST_PROPS } from '@vueda/use/useTest.js';
const props = defineProps({
    ...TEST_PROPS,
    inline: { type: Boolean, default: false },
});
</script>
`;

    const constSource = `
/**
 * Test props.
 * @vueda-spread props
 */
export const TEST_PROPS = {
    /** The name prop. */
    name: { type: String, required: true },
    /** Whether read-only. */
    readOnly: { type: Boolean, default: false },
};
`;

    it("injects spread props before inline props", async () => {
        const normalizer = makeNormalizerWithFiles({ [COMP_PATH]: compSource, [CONST_PATH]: constSource });
        const output = normalizer.normalize(
            componentPayload("client/lib/components/TestComp.vue", {
                props: [{ name: "inline", type: { name: "Boolean" }, defaultValue: { value: "false" } }],
            }),
        );

        await assertCanonical(output);

        const comp = output.nodes.find((n) => n.kind === "component");
        expect(comp.members.map((m) => m.name)).toEqual(["name", "readOnly", "inline"]);

        const nameProp = comp.members.find((m) => m.name === "name");
        expect(nameProp.kind).toBe("prop");
        expect(nameProp.description).toBe("The name prop.");
        expect(nameProp.type).toEqual({ name: "String" });
        expect(nameProp.required).toBe(true);

        const readOnlyProp = comp.members.find((m) => m.name === "readOnly");
        expect(readOnlyProp.type).toEqual({ name: "Boolean" });
        expect(readOnlyProp.default).toBe("false");
    });

    it("resolves spread props imported with an alias", () => {
        const aliasedCompSource = `
<script setup>
import { TEST_PROPS as WIDGET_PROPS } from '@vueda/use/useTest.js';
const props = defineProps({
    ...WIDGET_PROPS,
    inline: { type: Boolean, default: false },
});
</script>
`;
        const normalizer = makeNormalizerWithFiles({ [COMP_PATH]: aliasedCompSource, [CONST_PATH]: constSource });
        const output = normalizer.normalize(
            componentPayload("client/lib/components/TestComp.vue", {
                props: [{ name: "inline", type: { name: "Boolean" }, defaultValue: { value: "false" } }],
            }),
        );

        const comp = output.nodes.find((n) => n.kind === "component");
        expect(comp.members.map((m) => m.name)).toEqual(["name", "readOnly", "inline"]);
    });
});

// ---------------------------------------------------------------------------
// Spread emits injection
// ---------------------------------------------------------------------------

describe("VueDocgenNormalizer — spread emits", () => {
    const COMP_PATH = "/fake/client/lib/components/TestComp.vue";
    const CONST_PATH = "/fake/client/lib/use/useTest.js";

    const compSource = `
<script setup>
import { TEST_EMITS } from '@vueda/use/useTest.js';
const emit = defineEmits([...TEST_EMITS]);
</script>
`;

    const constSource = `
/**
 * Test emits.
 * @vueda-spread emits
 */
export const TEST_EMITS = [
    /** Emitted on value change. */
    'update:modelValue',
];
`;

    it("injects spread emits as event nodes before inline events", async () => {
        const normalizer = makeNormalizerWithFiles({ [COMP_PATH]: compSource, [CONST_PATH]: constSource });
        const output = normalizer.normalize(
            componentPayload("client/lib/components/TestComp.vue", {
                events: [{ name: "submit", description: "Inline event" }],
            }),
        );

        await assertCanonical(output);

        const comp = output.nodes.find((n) => n.kind === "component");
        // Spread event id is prepended before inline events in children
        expect(comp.children[0]).toBe("vue:component:TestComp:event:update:modelValue");
        // Inline event follows
        expect(comp.children[1]).toBe("vue:component:TestComp:event:submit");

        const spreadEvent = output.nodes.find((n) => n.name === "update:modelValue");
        expect(spreadEvent).toBeDefined();
        expect(spreadEvent.kind).toBe("event");
        expect(spreadEvent.description).toBe("Emitted on value change.");
    });

    it("resolves spread emits imported with an alias", () => {
        const aliasedCompSource = `
<script setup>
import { TEST_EMITS as WIDGET_EMITS } from '@vueda/use/useTest.js';
const emit = defineEmits([...WIDGET_EMITS]);
</script>
`;
        const normalizer = makeNormalizerWithFiles({ [COMP_PATH]: aliasedCompSource, [CONST_PATH]: constSource });
        const output = normalizer.normalize(componentPayload("client/lib/components/TestComp.vue"));

        const comp = output.nodes.find((n) => n.kind === "component");
        expect(comp.children[0]).toBe("vue:component:TestComp:event:update:modelValue");
    });
});

// ---------------------------------------------------------------------------
// Constant without @vueda-spread is not injected
// ---------------------------------------------------------------------------

describe("VueDocgenNormalizer — no @vueda-spread tag", () => {
    const COMP_PATH = "/fake/client/lib/components/TestComp.vue";
    const CONST_PATH = "/fake/client/lib/use/useTest.js";

    const compSource = `
<script setup>
import { PLAIN_PROPS } from '@vueda/use/useTest.js';
const props = defineProps({ ...PLAIN_PROPS });
</script>
`;

    const constSource = `
/** Plain constant without the annotation. */
export const PLAIN_PROPS = {
    foo: { type: String, default: null },
};
`;

    it("does not inject props from a constant lacking @vueda-spread", () => {
        const normalizer = makeNormalizerWithFiles({ [COMP_PATH]: compSource, [CONST_PATH]: constSource });
        const output = normalizer.normalize(componentPayload("client/lib/components/TestComp.vue"));

        const comp = output.nodes.find((n) => n.kind === "component");
        expect(comp.members).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Nested spread resolution (one level deep)
// ---------------------------------------------------------------------------

describe("VueDocgenNormalizer — nested spread", () => {
    const COMP_PATH = "/fake/client/lib/components/TestComp.vue";
    const PARENT_CONST_PATH = "/fake/client/lib/use/useParent.js";
    const CHILD_CONST_PATH = "/fake/client/lib/use/useChild.js";

    const compSource = `
<script setup>
import { PARENT_PROPS } from '@vueda/use/useParent.js';
const props = defineProps({ ...PARENT_PROPS });
</script>
`;

    const parentConstSource = `
import { CHILD_PROPS } from '@vueda/use/useChild.js';

/**
 * Parent props.
 * @vueda-spread props
 */
export const PARENT_PROPS = {
    ...CHILD_PROPS,
    /** Parent-only prop. */
    extra: { type: String, default: null },
};
`;

    const childConstSource = `
/**
 * Child props.
 * @vueda-spread props
 */
export const CHILD_PROPS = {
    /** Child prop. */
    childProp: { type: Boolean, default: false },
};
`;

    it("resolves one level of nested spread", async () => {
        const normalizer = makeNormalizerWithFiles({
            [COMP_PATH]: compSource,
            [PARENT_CONST_PATH]: parentConstSource,
            [CHILD_CONST_PATH]: childConstSource,
        });
        const output = normalizer.normalize(componentPayload("client/lib/components/TestComp.vue"));

        await assertCanonical(output);

        const comp = output.nodes.find((n) => n.kind === "component");
        const names = comp.members.map((m) => m.name);
        expect(names).toContain("childProp");
        expect(names).toContain("extra");
        // childProp comes before extra (spread before own keys)
        expect(names.indexOf("childProp")).toBeLessThan(names.indexOf("extra"));
    });
});

// ---------------------------------------------------------------------------
// Non-@vueda import paths are skipped without error
// ---------------------------------------------------------------------------

describe("VueDocgenNormalizer — non-@vueda import path", () => {
    const COMP_PATH = "/fake/client/lib/components/TestComp.vue";

    const compSource = `
<script setup>
import { EXTERNAL_PROPS } from 'some-external-library';
const props = defineProps({ ...EXTERNAL_PROPS });
</script>
`;

    it("silently skips spread identifiers imported from non-@vueda paths", () => {
        // No fileMap entry for the external library — should not throw
        const normalizer = makeNormalizerWithFiles({ [COMP_PATH]: compSource });
        expect(() => normalizer.normalize(componentPayload("client/lib/components/TestComp.vue"))).not.toThrow();

        const output = normalizer.normalize(componentPayload("client/lib/components/TestComp.vue"));
        const comp = output.nodes.find((n) => n.kind === "component");
        expect(comp.members).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Unit tests for exported parsing helpers
// ---------------------------------------------------------------------------

describe("extractScriptBlock", () => {
    it("returns whole source for plain JS (no script tags)", () => {
        const src = `export const X = 1;`;
        expect(extractScriptBlock(src, false)).toBe(src);
        expect(extractScriptBlock(src, true)).toBe(src);
    });

    it("extracts <script setup> block", () => {
        const src = `<script setup>\nconst x = 1;\n</script>`;
        expect(extractScriptBlock(src, true)).toBe("\nconst x = 1;\n");
    });

    it("extracts <script> (non-setup) block and ignores <script setup>", () => {
        const src = `<script>\nconst A = 1;\n</script>\n<script setup>\nconst B = 2;\n</script>`;
        expect(extractScriptBlock(src, false)).toBe("\nconst A = 1;\n");
    });
});

describe("findSpreadIdentifiersInCall", () => {
    it("finds spread identifiers inside defineProps", () => {
        const src = `const props = defineProps({ ...FOO_PROPS, ...BAR_PROPS, inline: { type: String } });`;
        expect(findSpreadIdentifiersInCall(src, "defineProps", "{", "}")).toEqual(["FOO_PROPS", "BAR_PROPS"]);
    });

    it("finds spread identifiers inside defineEmits", () => {
        const src = `const emit = defineEmits([...FOO_EMITS, 'extra']);`;
        expect(findSpreadIdentifiersInCall(src, "defineEmits", "[", "]")).toEqual(["FOO_EMITS"]);
    });

    it("returns empty array when call is absent", () => {
        expect(findSpreadIdentifiersInCall("const x = 1;", "defineProps", "{", "}")).toEqual([]);
    });
});

describe("findImportPath", () => {
    it("finds the import path for a named export", () => {
        const src = `import { A, B } from '@vueda/use/useA.js';\nimport { C } from 'other';`;
        expect(findImportPath(src, "A")).toEqual({
            importPath: "@vueda/use/useA.js",
            importedName: "A",
            localName: "A",
        });
        expect(findImportPath(src, "C")).toEqual({
            importPath: "other",
            importedName: "C",
            localName: "C",
        });
    });

    it("resolves aliased named imports by local identifier", () => {
        const src = `import { BASE_PROPS as WIDGET_PROPS } from '@vueda/use/useField.js';`;
        expect(findImportPath(src, "WIDGET_PROPS")).toEqual({
            importPath: "@vueda/use/useField.js",
            importedName: "BASE_PROPS",
            localName: "WIDGET_PROPS",
        });
    });

    it("returns null when identifier is not imported", () => {
        expect(findImportPath("import { A } from 'x';", "B")).toBeNull();
    });
});

describe("resolveVuedaPath", () => {
    it("maps @vueda/ prefix to client/lib/", () => {
        expect(resolveVuedaPath("@vueda/use/useField.js", "/repo")).toBe("/repo/client/lib/use/useField.js");
    });

    it("returns null for non-@vueda paths", () => {
        expect(resolveVuedaPath("some-lib", "/repo")).toBeNull();
        expect(resolveVuedaPath("./local", "/repo")).toBeNull();
    });
});

describe("parseSpreadConstant", () => {
    it("parses a props constant with @vueda-spread props", () => {
        const src = `
/**
 * Test props.
 * @vueda-spread props
 */
export const MY_PROPS = {
    /** The name. */
    name: { type: String, required: true },
    /** Read-only flag. */
    readOnly: { type: Boolean, default: false },
};
`;
        const result = parseSpreadConstant(src, "MY_PROPS");
        expect(result).not.toBeNull();
        expect(result.kind).toBe("props");
        expect(result.entries).toHaveLength(2);

        const [name, readOnly] = result.entries;
        expect(name.name).toBe("name");
        expect(name.kind).toBe("prop");
        expect(name.description).toBe("The name.");
        expect(name.type).toEqual({ name: "String" });
        expect(name.required).toBe(true);

        expect(readOnly.name).toBe("readOnly");
        expect(readOnly.type).toEqual({ name: "Boolean" });
        expect(readOnly.default).toBe("false");
    });

    it("parses an emits constant with @vueda-spread emits", () => {
        const src = `
/**
 * Test emits.
 * @vueda-spread emits
 */
export const MY_EMITS = [
    /** Value changed. */
    'update:modelValue',
];
`;
        const result = parseSpreadConstant(src, "MY_EMITS");
        expect(result).not.toBeNull();
        expect(result.kind).toBe("emits");
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].name).toBe("update:modelValue");
        expect(result.entries[0].description).toBe("Value changed.");
    });

    it("returns null when @vueda-spread tag is absent", () => {
        const src = `
/** Plain constant. */
export const PLAIN = { foo: { type: String } };
`;
        expect(parseSpreadConstant(src, "PLAIN")).toBeNull();
    });

    it("returns null when the identifier is not found", () => {
        const src = `
/**
 * @vueda-spread props
 */
export const OTHER = { x: { type: String } };
`;
        expect(parseSpreadConstant(src, "NOT_HERE")).toBeNull();
    });

    it("handles array type syntax", () => {
        const src = `
/**
 * @vueda-spread props
 */
export const MULTI_TYPE_PROPS = {
    /** Value. */
    value: { type: [String, Number, Boolean], default: undefined },
};
`;
        const result = parseSpreadConstant(src, "MULTI_TYPE_PROPS");
        expect(result.entries[0].type).toEqual({ name: "String|Number|Boolean" });
    });

    it("resolves nested spreads via nestedResolver", () => {
        const src = `
/**
 * @vueda-spread props
 */
export const PARENT_PROPS = {
    ...CHILD_PROPS,
    /** Own prop. */
    own: { type: String, default: null },
};
`;
        const childEntries = [{ name: "childProp", kind: "prop", description: "Child." }];
        const nestedResolver = (id) => (id === "CHILD_PROPS" ? childEntries : null);

        const result = parseSpreadConstant(src, "PARENT_PROPS", nestedResolver);
        expect(result.entries.map((e) => e.name)).toEqual(["childProp", "own"]);
    });

    it("ignores nested spreads when nestedResolver is null", () => {
        const src = `
/**
 * @vueda-spread props
 */
export const PARENT_PROPS = {
    ...CHILD_PROPS,
    /** Own prop. */
    own: { type: String, default: null },
};
`;
        const result = parseSpreadConstant(src, "PARENT_PROPS", null);
        // CHILD_PROPS spread is skipped, only own prop is included
        expect(result.entries.map((e) => e.name)).toEqual(["own"]);
    });

    it("handles apostrophes in JSDoc descriptions without breaking brace tracking", () => {
        const src = `
/**
 * @vueda-spread props
 */
export const POSSESSIVE_PROPS = {
    /** The widget's bound value. */
    value: { type: String, default: undefined },
    /** Another prop. */
    other: { type: Boolean, default: false },
};
`;
        const result = parseSpreadConstant(src, "POSSESSIVE_PROPS");
        expect(result).not.toBeNull();
        expect(result.entries.map((e) => e.name)).toEqual(["value", "other"]);
    });

    it("resolves the correct constant when multiple @vueda-spread constants share the same file", () => {
        const src = `
/**
 * @vueda-spread props
 */
export const FIRST_PROPS = {
    /** First prop. */
    first: { type: String, default: null },
};

/**
 * @vueda-spread emits
 */
export const FIRST_EMITS = [
    /** Emitted on change. */
    'update:modelValue',
];
`;
        const propsResult = parseSpreadConstant(src, "FIRST_PROPS");
        expect(propsResult?.kind).toBe("props");
        expect(propsResult?.entries[0].name).toBe("first");

        const emitsResult = parseSpreadConstant(src, "FIRST_EMITS");
        expect(emitsResult?.kind).toBe("emits");
        expect(emitsResult?.entries[0].name).toBe("update:modelValue");
    });
});

// ---------------------------------------------------------------------------
// Slot description passthrough and expression-artifact suppression
// ---------------------------------------------------------------------------

describe("VueDocgenNormalizer — slots", () => {
    const COMP_PATH = "/fake/client/lib/components/TestComp.vue";

    function normalizeSlots(slots) {
        const normalizer = new VueDocgenNormalizer({ repoRoot: "/fake" });
        const payload = {
            sourceDir: "client/lib",
            files: [
                {
                    filePath: "client/lib/components/TestComp.vue",
                    components: [
                        {
                            displayName: "TestComp",
                            props: [],
                            events: [],
                            slots,
                            sourceFiles: [COMP_PATH],
                        },
                    ],
                },
            ],
        };
        const output = normalizer.normalize(payload);
        return output.nodes.filter((n) => n.kind === "slot");
    }

    it("passes through slot description when vue-docgen provides one via @slot annotation", () => {
        const slots = normalizeSlots([
            { name: "filter-clear-button", description: "Clears the active filter.", scoped: false, bindings: [] },
        ]);
        expect(slots).toHaveLength(1);
        expect(slots[0].description).toBe("Clears the active filter.");
    });

    it("emits no description field on slot nodes when vue-docgen provides no description", () => {
        const slots = normalizeSlots([{ name: "default", scoped: false, bindings: [] }]);
        expect(slots).toHaveLength(1);
        expect(Object.prototype.hasOwnProperty.call(slots[0], "description")).toBe(false);
    });

    it("suppresses expression-artifact slot names when annotated slots are present", () => {
        const slots = normalizeSlots([
            { name: "resolvedSlotNames.clearButton.name", scoped: false, bindings: [] },
            { name: "filter-clear-button", description: "Clears the filter.", scoped: false, bindings: [] },
        ]);
        expect(slots).toHaveLength(1);
        expect(slots[0].name).toBe("filter-clear-button");
    });

    it("keeps all slots when no annotated slots are present (no suppression without annotations)", () => {
        const slots = normalizeSlots([
            { name: "resolvedSlotNames.header.name", scoped: false, bindings: [] },
            { name: "resolvedSlotNames.submitButton.name", scoped: false, bindings: [] },
        ]);
        expect(slots).toHaveLength(2);
    });

    it("suppresses camelCase identifier slot names when annotated slots are present", () => {
        const slots = normalizeSlots([
            { name: "fieldSlotName", scoped: false, bindings: [] },
            { name: "widget-slot", description: "Widget slot.", scoped: false, bindings: [] },
        ]);
        expect(slots).toHaveLength(1);
        expect(slots[0].name).toBe("widget-slot");
    });

    it("preserves scoped slot bindings and description together on annotated slots", () => {
        const slots = normalizeSlots([
            { name: "resolvedSlotNames.form.name", scoped: true, bindings: [{ name: "applyFilter" }] },
            {
                name: "filter-form",
                description: "Filter form body.",
                scoped: true,
                bindings: [{ name: "applyFilter" }],
            },
        ]);
        expect(slots).toHaveLength(1);
        const [slot] = slots;
        expect(slot.name).toBe("filter-form");
        expect(slot.description).toBe("Filter form body.");
        expect(slot.extensions.vueDocgen.scoped).toBe(true);
        expect(slot.signatures[0].parameters[0].name).toBe("applyFilter");
    });

    it("preserves binding description in slot parameters when present", () => {
        const slots = normalizeSlots([
            {
                name: "row",
                scoped: true,
                bindings: [{ name: "item", description: "The row data object." }, { name: "index" }],
            },
        ]);
        expect(slots).toHaveLength(1);
        const params = slots[0].signatures[0].parameters;
        expect(params[0].name).toBe("item");
        expect(params[0].description).toBe("The row data object.");
        expect(params[1].name).toBe("index");
        expect(params[1].description).toBeUndefined();
    });

    it("extracts real slot name from description when vue-docgen attaches @slot comment to artifact slot", () => {
        // vue-docgen attaches `<!-- @slot real-name Description -->` as the description
        // of the adjacent <slot :name="expression"> element.
        const slots = normalizeSlots([
            {
                name: "resolvedSlotNames.clearButton.name",
                description: "filter-clear-button Replaces the clear-filter button.",
                scoped: true,
                bindings: [{ name: "class" }, { name: "filter-name" }],
            },
        ]);
        expect(slots).toHaveLength(1);
        expect(slots[0].name).toBe("filter-clear-button");
        expect(slots[0].description).toBe("Replaces the clear-filter button.");
    });

    it("extracts slot name and fallbacks from bracket form annotation", () => {
        const slots = normalizeSlots([
            {
                name: "resolvedSlotNames.button.name",
                description:
                    "[toggle-button, fieldset-toggle-button, field(fieldName)toggle-button] Button to toggle visibility.",
                scoped: false,
                bindings: [],
            },
        ]);
        expect(slots).toHaveLength(1);
        expect(slots[0].name).toBe("toggle-button");
        expect(slots[0].description).toBe("Button to toggle visibility.");
        expect(slots[0].extensions.vueDocgen.fallbacks).toEqual([
            "fieldset-toggle-button",
            "field(fieldName)toggle-button",
        ]);
    });

    it("treats single-item bracket form the same as bare form (no fallbacks)", () => {
        const slots = normalizeSlots([
            {
                name: "resolvedSlotNames.button.name",
                description: "[toggle-button] Button to toggle visibility.",
                scoped: false,
                bindings: [],
            },
        ]);
        expect(slots).toHaveLength(1);
        expect(slots[0].name).toBe("toggle-button");
        expect(slots[0].extensions.vueDocgen.fallbacks).toBeUndefined();
    });

    it("throws when bracket list is empty", () => {
        expect(() =>
            normalizeSlots([
                {
                    name: "resolvedSlotNames.button.name",
                    description: "[] Description.",
                    scoped: false,
                    bindings: [],
                },
            ]),
        ).toThrow("empty brackets");
    });

    it("suppresses unresolved artifact slots when resolved slots are present via description extraction", () => {
        // Simulates a component where some slots have @slot annotations (description extraction
        // produces real names) and one generic pass-through slot has no description.
        const slots = normalizeSlots([
            {
                name: "resolvedSlotNames.clearButton.name",
                description: "filter-clear-button Replaces the clear-filter button.",
                scoped: true,
                bindings: [],
            },
            { name: "slotName", scoped: true, bindings: [{ name: "name" }] },
        ]);
        expect(slots).toHaveLength(1);
        expect(slots[0].name).toBe("filter-clear-button");
    });
});

// ---------------------------------------------------------------------------
// findCalledIdentifiers
// ---------------------------------------------------------------------------

describe("findCalledIdentifiers", () => {
    it("returns identifiers that appear as function calls", () => {
        const source = `
const a = foo(x);
const b = bar(y, z);
`;
        const result = findCalledIdentifiers(source);
        expect(result).toContain("foo");
        expect(result).toContain("bar");
    });

    it("deduplicates repeated calls", () => {
        const result = findCalledIdentifiers("foo(); foo(); bar();");
        expect(result.filter((id) => id === "foo")).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// findComponentTagValues
// ---------------------------------------------------------------------------

describe("findComponentTagValues", () => {
    it("extracts a single tag value from JSDoc before defineOptions", () => {
        const source = `
/**
 * Component description.
 *
 * @vueda-slot-forward DetailView
 */
defineOptions({ name: "ViewRead" });
`;
        expect(findComponentTagValues(source, "vueda-slot-forward")).toEqual(["DetailView"]);
    });

    it("extracts multiple occurrences of the same tag", () => {
        const source = `
/**
 * @vueda-slot-forward DetailView
 * @vueda-slot-forward ActionForm
 */
defineOptions({});
`;
        expect(findComponentTagValues(source, "vueda-slot-forward")).toEqual(["DetailView", "ActionForm"]);
    });

    it("returns empty array when defineOptions is absent", () => {
        const source = `/** @vueda-slot-forward Foo */\nconst x = 1;`;
        expect(findComponentTagValues(source, "vueda-slot-forward")).toEqual([]);
    });

    it("returns empty array when there is no JSDoc immediately before defineOptions", () => {
        const source = `const x = 1;\ndefineOptions({});`;
        expect(findComponentTagValues(source, "vueda-slot-forward")).toEqual([]);
    });

    it("returns empty array when the tag is absent", () => {
        const source = `/** Description. */\ndefineOptions({});`;
        expect(findComponentTagValues(source, "vueda-slot-forward")).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// parseSlotConstant
// ---------------------------------------------------------------------------

describe("parseSlotConstant", () => {
    it("parses a flat slot name array", () => {
        const src = `export const MY_SLOTS = ["label", "feedback"];`;
        const result = parseSlotConstant(src, "MY_SLOTS");
        expect(result).not.toBeNull();
        expect(result.kind).toBe("slots");
        expect(result.entries.map((e) => e.name)).toEqual(["label", "feedback"]);
    });

    it("returns null when the constant is not found", () => {
        expect(parseSlotConstant(`export const OTHER = ["x"];`, "MY_SLOTS")).toBeNull();
    });

    it("returns null when the constant value is not an array", () => {
        expect(parseSlotConstant(`export const MY_SLOTS = {};`, "MY_SLOTS")).toBeNull();
    });

    it("resolves nested spread elements via nestedResolver", () => {
        const src = `
export const CHILD_SLOTS = ["child-a"];
export const PARENT_SLOTS = [...CHILD_SLOTS, "parent-b"];
`;
        const nestedResolver = (id) => {
            const r = parseSlotConstant(src, id);
            return r ? r.entries : null;
        };
        const result = parseSlotConstant(src, "PARENT_SLOTS", nestedResolver);
        expect(result.entries.map((e) => e.name)).toEqual(["child-a", "parent-b"]);
    });

    it("preserves JSDoc descriptions on slot name entries", () => {
        const src = `
export const MY_SLOTS = [
    /** Override the label. */
    "label",
    "feedback",
];
`;
        const result = parseSlotConstant(src, "MY_SLOTS");
        expect(result.entries[0].description).toBe("Override the label.");
        expect(result.entries[1].description).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// parseSpreadFunctionAnnotation
// ---------------------------------------------------------------------------

describe("parseSpreadFunctionAnnotation", () => {
    it("returns annotation when function has @vueda-spread slots IDENTIFIER", () => {
        const src = `
/**
 * Returns active slot names.
 *
 * @vueda-spread slots WIDGET_LABEL_SLOTS
 */
export const getWidgetSlotsComputed = (slots) => {
    return computed(() => WIDGET_LABEL_SLOTS.filter((s) => slots[s]));
};
`;
        const result = parseSpreadFunctionAnnotation(src, "getWidgetSlotsComputed");
        expect(result).not.toBeNull();
        expect(result.kind).toBe("slots");
        expect(result.constantName).toBe("WIDGET_LABEL_SLOTS");
    });

    it("returns null when annotation is absent", () => {
        const src = `
/** No annotation here. */
export const getWidgetSlotsComputed = (slots) => slots;
`;
        expect(parseSpreadFunctionAnnotation(src, "getWidgetSlotsComputed")).toBeNull();
    });

    it("returns null when identifier is not found", () => {
        const src = `
/**
 * @vueda-spread slots WIDGET_LABEL_SLOTS
 */
export const otherFn = () => {};
`;
        expect(parseSpreadFunctionAnnotation(src, "getWidgetSlotsComputed")).toBeNull();
    });

    it("returns null when JSDoc is not immediately before the export", () => {
        const src = `
/**
 * @vueda-spread slots WIDGET_LABEL_SLOTS
 */
const intermediate = 1;
export const getWidgetSlotsComputed = (slots) => slots;
`;
        expect(parseSpreadFunctionAnnotation(src, "getWidgetSlotsComputed")).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// @vueda-spread slots: integration (VueDocgenNormalizer)
// ---------------------------------------------------------------------------

describe("VueDocgenNormalizer — @vueda-spread slots", () => {
    const COMP_PATH = "/fake/client/lib/widgets/WidgetInput.vue";
    const LABEL_PATH = "/fake/client/lib/widgets/WidgetLabel.vue";
    const FEEDBACK_PATH = "/fake/client/lib/components/FormHiddenFeedback.vue";

    const compSource = `
<script setup>
import { getWidgetSlotsComputed } from '@vueda/widgets/WidgetLabel.vue';
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
defineOptions({ name: "WidgetInput" });
</script>
`;

    const labelSource = `
<script>
import { FORM_HIDDEN_FEEDBACK_SLOTS } from '@vueda/components/FormHiddenFeedback.vue';

export const ONLY_WIDGET_LABEL_SLOTS = ["label", "feedback"];
export const WIDGET_LABEL_SLOTS = [...ONLY_WIDGET_LABEL_SLOTS, ...FORM_HIDDEN_FEEDBACK_SLOTS];
/**
 * Returns active slot names.
 *
 * @vueda-spread slots WIDGET_LABEL_SLOTS
 */
export const getWidgetSlotsComputed = (slots) => {
    return WIDGET_LABEL_SLOTS.filter((s) => slots[s]);
};
</script>
`;

    const feedbackSource = `
<script>
export const FORM_HIDDEN_FEEDBACK_SLOTS = [
    "feedback-help-icon",
    "feedback-error-icon",
];
</script>
`;

    const fileMap = {
        [COMP_PATH]: compSource,
        [LABEL_PATH]: labelSource,
        [FEEDBACK_PATH]: feedbackSource,
    };

    it("injects slot nodes from the annotated function's named constant", async () => {
        const normalizer = makeNormalizerWithFiles(fileMap);
        const output = normalizer.normalize(componentPayload("client/lib/widgets/WidgetInput.vue", { slots: [] }));

        await assertCanonical(output);

        const slotNodes = output.nodes.filter((n) => n.kind === "slot");
        const slotNames = slotNodes.map((n) => n.name);

        expect(slotNames).toContain("label");
        expect(slotNames).toContain("feedback");
        expect(slotNames).toContain("feedback-help-icon");
        expect(slotNames).toContain("feedback-error-icon");
    });

    it("marks injected slots with fromSpread: true in extensions", () => {
        const normalizer = makeNormalizerWithFiles(fileMap);
        const output = normalizer.normalize(componentPayload("client/lib/widgets/WidgetInput.vue", { slots: [] }));

        const labelSlot = output.nodes.find((n) => n.kind === "slot" && n.name === "label");
        expect(labelSlot.extensions.vueDocgen.fromSpread).toBe(true);
    });

    it("does not duplicate slots that are also declared inline", () => {
        const normalizer = makeNormalizerWithFiles(fileMap);
        const output = normalizer.normalize(
            componentPayload("client/lib/widgets/WidgetInput.vue", {
                slots: [{ name: "label", scoped: false, bindings: [] }],
            }),
        );

        const labelSlots = output.nodes.filter((n) => n.kind === "slot" && n.name === "label");
        expect(labelSlots).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// @vueda-slot-forward: integration (VueDocgenNormalizer)
// ---------------------------------------------------------------------------

describe("VueDocgenNormalizer — @vueda-slot-forward", () => {
    const DETAIL_PATH = "/fake/client/lib/components/DetailView.vue";
    const VIEW_PATH = "/fake/client/lib/views/ViewRead.vue";

    const detailPayloadSlots = [
        { name: "extra-buttons", scoped: false, bindings: [] },
        { name: "submit-button", scoped: true, bindings: [{ name: "onSubmit" }] },
    ];

    const viewSource = `
<script setup>
/**
 * Read-only detail view.
 *
 * @vueda-slot-forward DetailView
 */
defineOptions({ name: "ViewRead" });
</script>
`;

    it("injects slot nodes from the forwarded component", async () => {
        const normalizer = makeNormalizerWithFiles({ [VIEW_PATH]: viewSource, [DETAIL_PATH]: "<script></script>" });
        const payload = {
            sourceDir: "client/lib",
            files: [
                {
                    filePath: "client/lib/components/DetailView.vue",
                    components: [{ displayName: "DetailView", props: [], events: [], slots: detailPayloadSlots }],
                },
                {
                    filePath: "client/lib/views/ViewRead.vue",
                    components: [{ displayName: "ViewRead", props: [], events: [], slots: [] }],
                },
            ],
        };

        const output = normalizer.normalize(payload);

        await assertCanonical(output);

        const viewComp = output.nodes.find((n) => n.kind === "component" && n.name === "ViewRead");
        const viewSlots = output.nodes.filter((n) => n.kind === "slot" && viewComp.children.includes(n.id));
        const slotNames = viewSlots.map((n) => n.name);

        expect(slotNames).toContain("extra-buttons");
        expect(slotNames).toContain("submit-button");
    });

    it("marks forwarded slots with fromForward: true in extensions", async () => {
        const normalizer = makeNormalizerWithFiles({ [VIEW_PATH]: viewSource, [DETAIL_PATH]: "<script></script>" });
        const payload = {
            sourceDir: "client/lib",
            files: [
                {
                    filePath: "client/lib/components/DetailView.vue",
                    components: [{ displayName: "DetailView", props: [], events: [], slots: detailPayloadSlots }],
                },
                {
                    filePath: "client/lib/views/ViewRead.vue",
                    components: [{ displayName: "ViewRead", props: [], events: [], slots: [] }],
                },
            ],
        };

        const output = normalizer.normalize(payload);
        const viewComp = output.nodes.find((n) => n.kind === "component" && n.name === "ViewRead");
        const extraButtons = output.nodes.find(
            (n) => n.kind === "slot" && n.name === "extra-buttons" && viewComp.children.includes(n.id),
        );
        expect(extraButtons.extensions.vueDocgen.fromForward).toBe(true);
    });

    it("supports multiple @vueda-slot-forward tags", () => {
        const multiForwardSource = `
<script setup>
/**
 * @vueda-slot-forward DetailView
 * @vueda-slot-forward ActionForm
 */
defineOptions({ name: "AuthorizingForm" });
</script>
`;
        const normalizer = makeNormalizerWithFiles({
            "/fake/client/lib/views/AuthorizingForm.vue": multiForwardSource,
            [DETAIL_PATH]: "<script></script>",
            "/fake/client/lib/components/ActionForm.vue": "<script></script>",
        });
        const payload = {
            sourceDir: "client/lib",
            files: [
                {
                    filePath: "client/lib/components/DetailView.vue",
                    components: [
                        {
                            displayName: "DetailView",
                            props: [],
                            events: [],
                            slots: [{ name: "extra-buttons", scoped: false, bindings: [] }],
                        },
                    ],
                },
                {
                    filePath: "client/lib/components/ActionForm.vue",
                    components: [
                        {
                            displayName: "ActionForm",
                            props: [],
                            events: [],
                            slots: [{ name: "confirm-message", scoped: false, bindings: [] }],
                        },
                    ],
                },
                {
                    filePath: "client/lib/views/AuthorizingForm.vue",
                    components: [{ displayName: "AuthorizingForm", props: [], events: [], slots: [] }],
                },
            ],
        };

        const output = normalizer.normalize(payload);
        const comp = output.nodes.find((n) => n.kind === "component" && n.name === "AuthorizingForm");
        const slotNames = output.nodes
            .filter((n) => n.kind === "slot" && comp.children.includes(n.id))
            .map((n) => n.name);

        expect(slotNames).toContain("extra-buttons");
        expect(slotNames).toContain("confirm-message");
    });
});
