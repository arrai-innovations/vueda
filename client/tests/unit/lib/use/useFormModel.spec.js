import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";

describe("lib/use/useFormModel.js", () => {
    beforeEach(() => {
        vi.doMock("@vueda/use/useModelConfig", () => ({
            useModelConfig: vi.fn(() => ({ config: {} })),
        }));
    });

    afterEach(() => {
        vi.resetAllMocks();
        vi.resetModules();
    });

    function makeBaseProps(overrides = {}) {
        const vue = require("vue");
        return vue.reactive({
            app: "foo",
            model: "bar",
            view: "create",
            fields: [],
            expand: [],
            fieldDetails: {},
            expandDetails: {},
            ...overrides,
        });
    }

    scopedIt("creates field state including expansion fields", async () => {
        const { useFormModel } = await import("@vueda/use/useFormModel.js");
        const vue = await import("vue");
        const useModelConfig = (await import("@vueda/use/useModelConfig")).useModelConfig;

        const modelConfig = vue.readonly(vue.reactive({ config: {} }));
        useModelConfig.mockReturnValue(modelConfig);

        const props = vue.reactive({
            app: "foo",
            model: "bar",
            view: "create",
            fields: ["name", "department"],
            expand: ["department"],
            fieldDetails: {
                name: {
                    name: "name",
                    typeSerializer: "CharField",
                    typeModel: "CharField",
                    many: false,
                    readOnly: false,
                },
                department: {
                    name: "department",
                    typeSerializer: "CharField",
                    typeModel: "CharField",
                    many: false,
                    readOnly: false,
                },
            },
            expandDetails: {
                department: {
                    f: {
                        title: {
                            name: "title",
                            typeSerializer: "CharField",
                            typeModel: "CharField",
                            many: false,
                            readOnly: false,
                        },
                    },
                },
            },
        });

        const state = useFormModel(props);
        await flushPromises();

        expect([...state.baseFieldNames]).toEqual(["name", "department"]);
        expect([...state.expansionFieldNames]).toEqual(["department__title"]);
        expect([...state.expandedFieldNames]).toEqual(["department"]);

        expect(state.fieldComponents.name).toBeTruthy();
        expect(state.fieldComponents["department"]).toBeTruthy();
        expect(state.fieldComponents["department__title"]).toBeTruthy();
        expect(state.widgetComponents.name).toBeTruthy();
    });

    scopedIt("uses expand details when field name contains '__'", async () => {
        const { useFormModel } = await import("@vueda/use/useFormModel.js");
        const vue = await import("vue");
        const useModelConfig = (await import("@vueda/use/useModelConfig")).useModelConfig;

        const modelConfig = vue.readonly(vue.reactive({ config: {} }));
        useModelConfig.mockReturnValue(modelConfig);

        const props = vue.reactive({
            app: "foo",
            model: "bar",
            view: "create",
            fields: ["department__title"],
            expand: ["department"],
            fieldDetails: {
                department: {
                    name: "department",
                    typeSerializer: "CharField",
                    typeModel: "CharField",
                    many: false,
                    readOnly: false,
                },
            },
            expandDetails: {
                department: {
                    f: {
                        title: {
                            name: "title",
                            typeSerializer: "CharField",
                            typeModel: "CharField",
                            many: false,
                            readOnly: false,
                        },
                    },
                },
            },
        });

        const state = useFormModel(props);
        await flushPromises();

        expect([...state.baseFieldNames]).toEqual([]);
        expect([...state.expansionFieldNames]).toEqual(["department__title"]);
        expect([...state.expandedFieldNames]).toEqual([]);

        expect(state.fieldComponents["department__title"]).toBeTruthy();
        expect(state.widgetComponents["department__title"]).toBeTruthy();
    });

    scopedIt("throws on unknown expand name", async () => {
        const { useFormModel } = await import("@vueda/use/useFormModel.js");
        const vue = await import("vue");
        const useModelConfig = (await import("@vueda/use/useModelConfig")).useModelConfig;

        const modelConfig = vue.readonly(vue.reactive({ config: {} }));
        useModelConfig.mockReturnValue(modelConfig);

        const props = vue.reactive({
            app: "foo",
            model: "bar",
            view: "create",
            fields: ["department__title"],
            expand: [],
            fieldDetails: {
                department: {
                    name: "department",
                    typeSerializer: "CharField",
                    typeModel: "CharField",
                    many: false,
                    readOnly: false,
                },
            },
            expandDetails: {},
        });

        expect(() => useFormModel(props)).toThrow("Unknown expand department specified for foo.bar");
    });

    scopedIt("handles missing field details by clearing state", async () => {
        const { useFormModel } = await import("@vueda/use/useFormModel.js");
        const vue = await import("vue");
        const useModelConfig = (await import("@vueda/use/useModelConfig")).useModelConfig;

        const modelConfig = vue.readonly(vue.reactive({ config: {} }));
        useModelConfig.mockReturnValue(modelConfig);

        const props = vue.reactive({
            app: "foo",
            model: "bar",
            view: "create",
            // fields will be provided by model config once loaded
            expand: [],
            fieldDetails: {},
            expandDetails: {},
        });

        const state = useFormModel(props);
        await flushPromises();

        expect(state.fieldComponents).toEqual({});
        expect(state.widgetComponents).toEqual({});
        expect([...state.baseFieldNames]).toEqual([]);
        expect([...state.expansionFieldNames]).toEqual([]);
        expect([...state.expandedFieldNames]).toEqual([]);
    });
    scopedIt("creates default details for top-level fields with underscore suffixes", async () => {
        const { useFormModel } = await import("@vueda/use/useFormModel.js");
        const vue = await import("vue");
        const useModelConfig = (await import("@vueda/use/useModelConfig")).useModelConfig;

        const modelConfig = vue.readonly(vue.reactive({ config: {} }));
        useModelConfig.mockReturnValue(modelConfig);

        const props = vue.reactive({
            app: "foo",
            model: "bar",
            view: "create",
            fields: ["display_"],
            expand: [],
            fieldDetails: {},
            expandDetails: {},
        });

        const state = useFormModel(props);
        await flushPromises();

        expect([...state.baseFieldNames]).toEqual(["display_"]);
        expect(state.fieldComponents.display_).toBeTruthy();
        expect(state.widgetComponents.display_).toBeTruthy();
        expect(state.fieldProps.display_.readOnly).toBe(true); // assuming default readOnly
    });
    scopedIt("creates default details for expansion fields with underscore suffixes", async () => {
        const { useFormModel } = await import("@vueda/use/useFormModel.js");
        const vue = await import("vue");
        const useModelConfig = (await import("@vueda/use/useModelConfig")).useModelConfig;

        const modelConfig = vue.readonly(vue.reactive({ config: {} }));
        useModelConfig.mockReturnValue(modelConfig);

        const props = vue.reactive({
            app: "foo",
            model: "bar",
            view: "create",
            fields: ["department__display_"],
            expand: ["department"],
            fieldDetails: {
                department: {
                    name: "department",
                    typeSerializer: "CharField",
                    typeModel: "CharField",
                    many: false,
                    readOnly: false,
                },
            },
            expandDetails: {
                department: {
                    f: {},
                },
            },
        });

        const state = useFormModel(props);
        await flushPromises();

        expect([...state.baseFieldNames]).toEqual([]);
        expect([...state.expansionFieldNames]).toEqual(["department__display_"]);
        expect(state.fieldComponents["department__display_"]).toBeTruthy();
        expect(state.widgetComponents["department__display_"]).toBeTruthy();
        expect(state.fieldProps["department__display_"].readOnly).toBe(true);
    });
    scopedIt("throws on unknown field inside a known expand", async () => {
        const { useFormModel } = await import("@vueda/use/useFormModel.js");
        const vue = await import("vue");
        const useModelConfig = (await import("@vueda/use/useModelConfig")).useModelConfig;

        // mock empty config
        const modelConfig = vue.readonly(vue.reactive({ config: {} }));
        useModelConfig.mockReturnValue(modelConfig);

        const props = vue.reactive({
            app: "foo",
            model: "bar",
            view: "create",
            fields: ["department__bogus"], // <-- bogus sub-field, **no trailing _**
            expand: ["department"],
            fieldDetails: {
                department: {
                    name: "department",
                    typeSerializer: "CharField",
                    typeModel: "CharField",
                    many: false,
                    readOnly: false,
                },
            },
            expandDetails: {
                department: { f: {} }, // no bogus entry here
            },
        });

        expect(() => useFormModel(props)).toThrow("Unknown field bogus specified for expand department on foo.bar");
    });
    scopedIt("maps ChoiceField -> choice widget and props.options", async () => {
        const { useFormModel } = await import("@vueda/use/useFormModel.js");

        const props = makeBaseProps({
            fields: ["status"],
            fieldDetails: {
                status: {
                    name: "status",
                    typeSerializer: "ChoiceField",
                    typeModel: "ChoiceField",
                    many: false,
                    choices: [{ value: "A", display_name: "Active" }],
                    readOnly: false,
                },
            },
        });

        const state = useFormModel(props);
        await flushPromises();

        expect(state.widgetComponents.status).toBeTruthy();
        // default widgetProps should include the collapsed choices array
        expect(state.widgetProps.status.options).toEqual(props.fieldDetails.status.choices);
    });

    scopedIt("maps GeneratedField using typeDb mapping", async () => {
        const { useFormModel } = await import("@vueda/use/useFormModel.js");
        const { defaultFieldMappings } = await import("@vueda/utils/fieldMappings.js");

        const props = makeBaseProps({
            fields: ["amount"],
            fieldDetails: {
                amount: {
                    name: "amount",
                    typeSerializer: "ModelField",
                    typeModel: "GeneratedField",
                    typeDb: "FloatField",
                    many: false,
                    readOnly: false,
                },
            },
        });

        const state = useFormModel(props);
        await flushPromises();

        expect(state.fieldComponents.amount).toBe(defaultFieldMappings.ModelField.GeneratedField.FloatField.component);
    });

    scopedIt("uses choice field component when choices provided", async () => {
        const { useFormModel } = await import("@vueda/use/useFormModel.js");
        const { choiceFieldMappings } = await import("@vueda/utils/fieldMappings.js");

        const props = makeBaseProps({
            fields: ["kind"],
            fieldDetails: {
                kind: {
                    name: "kind",
                    typeSerializer: "ChoiceField",
                    typeModel: "CharField",
                    choices: [{ value: "A", display_name: "Alpha" }],
                    many: false,
                    readOnly: false,
                },
            },
        });

        const state = useFormModel(props);
        await flushPromises();

        expect(state.fieldComponents.kind).toBe(choiceFieldMappings.ChoiceField.CharField.component);
    });
    scopedIt("uses many field / widget mappings when many=true", async () => {
        const { useFormModel } = await import("@vueda/use/useFormModel.js");

        const props = makeBaseProps({
            fields: ["tags"],
            fieldDetails: {
                tags: {
                    name: "tags",
                    typeSerializer: "TagField",
                    typeModel: "TagField",
                    many: true,
                    readOnly: false,
                },
            },
        });

        const state = useFormModel(props);
        await flushPromises();

        expect(state.fieldComponents.tags).toBeTruthy();
        expect(state.widgetComponents.tags).toBeTruthy();
    });
    scopedIt("prefers explicit prop readOnly over config defaults", async () => {
        // mock model-config to declare name readOnly=true
        vi.doMock("@vueda/use/useModelConfig", () => ({
            useModelConfig: vi.fn(() => ({
                config: {
                    fieldProps: { code: { readOnly: true } },
                },
            })),
        }));

        const { useFormModel } = await import("@vueda/use/useFormModel.js");

        const props = makeBaseProps({
            fields: ["code"],
            fieldDetails: {
                code: {
                    name: "code",
                    typeSerializer: "CharField",
                    typeModel: "CharField",
                    readOnly: false,
                },
            },
            fieldProps: {
                code: { readOnly: false }, // override
            },
        });

        const state = useFormModel(props);
        await flushPromises();

        expect(state.widgetProps.code.readOnly).toBe(false);
    });
    scopedIt("merges themeOverride from form + fieldProps", async () => {
        const { useFormModel } = await import("@vueda/use/useFormModel.js");

        const props = makeBaseProps({
            fields: ["name"],
            fieldDetails: {
                name: {
                    name: "name",
                    typeSerializer: "CharField",
                    typeModel: "CharField",
                    readOnly: false,
                },
            },
            themeOverride: {
                slots: {
                    control: {
                        base: {
                            class: "form-ctrl",
                        },
                    },
                },
            },
            fieldProps: {
                name: {
                    themeOverride: {
                        slots: {
                            control: {
                                base: {
                                    style: "color:red;",
                                },
                            },
                        },
                    },
                },
            },
        });

        const state = useFormModel(props);
        await flushPromises();

        const theme = state.fieldProps.name.themeOverride;
        expect(theme.slots.control.base.class).toBe("form-ctrl");
        expect(theme.slots.control.base.style).toBe("color:red;");
    });
    scopedIt("uses prop.fields when both prop and config supply fields", async () => {
        vi.doMock("@vueda/use/useModelConfig", () => ({
            useModelConfig: vi.fn(() => ({
                config: { fields: ["name"] },
            })),
        }));
        const { useFormModel } = await import("@vueda/use/useFormModel.js");

        const props = makeBaseProps({
            fields: ["title"],
            fieldDetails: {
                title: {
                    name: "title",
                    typeSerializer: "CharField",
                    typeModel: "CharField",
                    readOnly: false,
                },
            },
        });

        const state = useFormModel(props);
        await flushPromises();

        expect([...state.baseFieldNames]).toEqual(["title"]);
    });
    scopedIt("accepts factory functions for custom field + widget components", async () => {
        // simple placeholder components
        const FieldCustom = { name: "FieldCustom" };
        const WidgetCustom = { name: "WidgetCustom" };

        const { useFormModel } = await import("@vueda/use/useFormModel.js");

        const props = makeBaseProps({
            fields: ["summary"],
            fieldDetails: {
                summary: {
                    name: "summary",
                    typeSerializer: "CharField",
                    typeModel: "CharField",
                    readOnly: false,
                },
            },
            fieldComponents: {
                summary: () => FieldCustom,
            },
            widgetComponents: {
                summary: () => WidgetCustom,
            },
        });

        const state = useFormModel(props);
        await flushPromises();

        expect(state.fieldComponents.summary).toBe(FieldCustom);
        expect(state.widgetComponents.summary).toBe(WidgetCustom);
    });

    scopedIt("uses WidgetReadOnly when field.readOnly is true", async () => {
        const { useFormModel } = await import("@vueda/use/useFormModel.js");
        const { availableWidgets } = await import("@vueda/utils/formLookups.js");

        const props = makeBaseProps({
            fields: ["title"],
            fieldDetails: {
                title: {
                    name: "title",
                    typeSerializer: "CharField",
                    typeModel: "CharField",
                    many: false,
                    readOnly: true,
                },
            },
            fieldProps: {
                title: { readOnly: false },
            },
        });

        const state = useFormModel(props);
        await flushPromises();

        expect(state.widgetComponents.title).toBe(availableWidgets.WidgetReadOnly);
    });

    scopedIt("uses manyWidget for choice fields when many=true", async () => {
        const { useFormModel } = await import("@vueda/use/useFormModel.js");
        const { availableWidgets } = await import("@vueda/utils/formLookups.js");

        const props = makeBaseProps({
            fields: ["status"],
            fieldDetails: {
                status: {
                    name: "status",
                    typeSerializer: "CharField",
                    typeModel: "CharField",
                    many: true,
                    choices: [{ value: "A", display_name: "Active" }],
                    readOnly: false,
                },
            },
        });

        const state = useFormModel(props);
        await flushPromises();

        expect(state.widgetComponents.status).toBe(availableWidgets.WidgetMultiSelect);
    });
});
