import {
    VueDocgenNormalizer,
    extractScriptBlock,
    findImportPath,
    findSpreadIdentifiersInCall,
    parseSpreadConstant,
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
