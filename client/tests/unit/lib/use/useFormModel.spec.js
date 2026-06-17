import { scopedIt, withSetup } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";

describe("lib/use/useFormModel.js", () => {
    let modelConfig;
    let vue;
    beforeEach(async () => {
        vi.doMock("@vueda/use/useModelConfig", () => ({
            useModelConfig: vi.fn(() => ({ config: {} })),
        }));
        vue = await import("vue");
        const useModelConfig = (await import("@vueda/use/useModelConfig")).useModelConfig;
        modelConfig = vue.reactive({ config: { fieldDetails: {} } });
        const modelConfigReturnValue = vue.readonly(modelConfig);
        useModelConfig.mockReturnValue(modelConfigReturnValue);
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

    describe("field state computation", () => {
        scopedIt("creates field state including expansion fields", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");

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

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;
            modelConfig.config.expandDetails = props.expandDetails;
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

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;
            modelConfig.config.expandDetails = props.expandDetails;

            await flushPromises();

            expect([...state.baseFieldNames]).toEqual([]);
            expect([...state.expansionFieldNames]).toEqual(["department__title"]);
            expect([...state.expandedFieldNames]).toEqual([]);

            expect(state.fieldComponents["department__title"]).toBeTruthy();
            expect(state.widgetComponents["department__title"]).toBeTruthy();
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

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect(state.fieldComponents).toEqual({});
            expect(state.widgetComponents).toEqual({});
            expect([...state.baseFieldNames]).toEqual([]);
            expect([...state.expansionFieldNames]).toEqual([]);
            expect([...state.expandedFieldNames]).toEqual([]);
        });
        scopedIt("creates default details for top-level fields with underscore suffixes", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");

            const props = vue.reactive({
                app: "foo",
                model: "bar",
                view: "create",
                fields: ["display_"],
                expand: [],
                fieldDetails: {
                    display_: {
                        name: "display_",
                        typeSerializer: "CharField",
                        typeModel: "CharField",
                    },
                },
                expandDetails: {},
            });

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect([...state.baseFieldNames]).toEqual(["display_"]);
            expect(state.fieldComponents.display_).toBeTruthy();
            expect(state.widgetComponents.display_).toBeTruthy();
        });
        scopedIt("creates default details for expansion fields with underscore suffixes", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");
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
                        f: {
                            display_: {
                                name: "display_",
                                typeSerializer: "CharField",
                                typeModel: "CharField",
                                readOnly: true,
                            },
                        },
                    },
                },
            });

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;
            modelConfig.config.expandDetails = props.expandDetails;

            await flushPromises();

            expect([...state.baseFieldNames]).toEqual([]);
            expect([...state.expansionFieldNames]).toEqual(["department__display_"]);
            expect(state.fieldComponents["department__display_"]).toBeTruthy();
            expect(state.widgetComponents["department__display_"]).toBeTruthy();
            expect(state.fieldProps["department__display_"].readOnly).toBe(true);
        });
        scopedIt("defaults to [] when computedFields is falsey", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");

            const props = makeBaseProps({
                fields: ["name"],
                computedFields: null,
                fieldDetails: {
                    name: {
                        name: "name",
                        typeSerializer: "CharField",
                        typeModel: "CharField",
                        many: false,
                        readOnly: false,
                    },
                },
            });

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect(state.computedFields).toEqual([]);
            expect(state.fieldProps.name.contextless).toBe(false);
        });
        scopedIt("uses FormField for computed fields", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");
            const { availableFields } = await import("@vueda/utils/formLookups.js");

            const props = makeBaseProps({
                fields: ["score"],
                computedFields: ["score"],
                fieldDetails: {
                    score: {
                        name: "score",
                        typeSerializer: "CharField",
                        typeModel: "CharField",
                        many: false,
                        readOnly: false,
                    },
                },
            });

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect(state.fieldComponents.score).toStrictEqual(availableFields.FormField);
        });
        scopedIt("uses prop.fields when both prop and config supply fields", async () => {
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
            modelConfig.config.fields = ["name"];

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect([...state.baseFieldNames]).toEqual(["title"]);
        });
    });
    describe("field detail fallback behavior", () => {
        scopedIt("prefers explicit prop readOnly over config defaults", async () => {
            // mock model-config to declare name readOnly=true

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
            modelConfig.config.fieldProps = { code: { readOnly: true } };

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

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

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            const theme = state.fieldProps.name.themeOverride;
            expect(theme.slots.control.base.class).toBe("form-ctrl");
            expect(theme.slots.control.base.style).toBe("color:red;");
        });
        scopedIt("applies ModelField specific fieldProps", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");

            const props = makeBaseProps({
                fields: ["rating"],
                fieldDetails: {
                    rating: {
                        name: "rating",
                        typeSerializer: "ModelField",
                        typeModel: "GeneratedField",
                        typeDb: "FloatField",
                        many: false,
                        readOnly: false,
                    },
                },
            });

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect(state.fieldProps.rating.validation).toBe("numeric");
        });
        scopedIt("defaults readOnly to false when field detail omits property", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");

            const props = makeBaseProps({
                fields: ["name"],
                fieldDetails: {
                    name: {
                        name: "name",
                        typeSerializer: "CharField",
                        typeModel: "CharField",
                        many: false,
                        // no readOnly property
                    },
                },
            });

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect(state.fieldProps.name.readOnly).toBe(false);
            expect(state.widgetProps.name.readOnly).toBe(false);
        });
        scopedIt("sets orientation=read on fieldProps when view=read", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");

            const props = makeBaseProps({
                view: "read",
                fields: ["name"],
                fieldDetails: {
                    name: {
                        name: "name",
                        typeSerializer: "CharField",
                        typeModel: "CharField",
                        many: false,
                        readOnly: false,
                    },
                },
            });

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect(state.fieldProps.name.orientation).toBe("read");
        });
        scopedIt("does not set orientation on fieldProps for non-read views", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");

            const props = makeBaseProps({
                fields: ["name"],
                fieldDetails: {
                    name: {
                        name: "name",
                        typeSerializer: "CharField",
                        typeModel: "CharField",
                        many: false,
                        readOnly: false,
                    },
                },
            });

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect(state.fieldProps.name.orientation).toBeUndefined();
        });
    });
    describe("expand field resolution", () => {
        scopedIt("throws on unknown expand name", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");
            const vue = await import("vue");

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
            let errorThrown = null;
            try {
                await withSetup(() => useFormModel(props));
                modelConfig.config.fieldDetails = props.fieldDetails;
                await vue.nextTick();
            } catch (err) {
                errorThrown = err;
            }
            expect(errorThrown.message).toBe("Unknown expand department specified for foo.bar");
        });
        scopedIt("throws on unknown field inside a known expand", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");

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
            let errorThrown = null;
            try {
                await withSetup(() => useFormModel(props));
                modelConfig.config.fieldDetails = props.fieldDetails;
                modelConfig.config.expandDetails = props.expandDetails;
                await vue.nextTick();
            } catch (err) {
                errorThrown = err;
            }

            expect(errorThrown.message).toBe("Unknown field bogus specified for expand department on foo.bar");
        });
        scopedIt("ignores expand base names not present in fields", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");

            const props = vue.reactive({
                app: "foo",
                model: "bar",
                view: "create",
                fields: ["name"],
                expand: ["department"],
                fieldDetails: {
                    name: {
                        name: "name",
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

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;
            modelConfig.config.expandDetails = props.expandDetails;

            await flushPromises();

            expect([...state.baseFieldNames]).toEqual(["name"]);
            expect([...state.expansionFieldNames]).toEqual([]);
        });
        scopedIt("handles expand with no field definitions", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");

            const props = vue.reactive({
                app: "foo",
                model: "bar",
                view: "create",
                fields: ["department"],
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
                    department: {}, // no 'f' property
                },
            });

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;
            modelConfig.config.expandDetails = props.expandDetails;

            await flushPromises();

            expect([...state.baseFieldNames]).toEqual(["department"]);
            expect([...state.expansionFieldNames]).toEqual([]);
            expect([...state.expandedFieldNames]).toEqual(["department"]);
            expect(state.fieldComponents.department).toBeTruthy();
            expect(state.widgetComponents.department).toBe(null);
        });
    });
    describe("widget and component resolution", () => {
        scopedIt("maps ChoiceField -> choice widget and props.options", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");

            const props = makeBaseProps({
                fields: ["status"],
                fieldDetails: {
                    status: {
                        name: "status",
                        typeSerializer: "ChoiceField",
                        typeModel: "CharField",
                        many: false,
                        choices: [{ value: "A", display_name: "Active" }],
                        readOnly: false,
                    },
                },
            });

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect(state.widgetComponents.status).toBeTruthy();
            // default widgetProps should include the collapsed choices array
            expect(state.widgetProps.status.options).toEqual(props.fieldDetails.status.choices);
        });
        scopedIt("maps GeneratedField using typeDb mapping", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");
            const { availableFields } = await import("@vueda/utils/formLookups.js");

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

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect(state.fieldComponents.amount).toStrictEqual(availableFields.FormField);
        });
        scopedIt("uses default mapping when typeModel is missing", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");
            const { availableFields } = await import("@vueda/utils/formLookups.js");
            const { defaultFieldMappings } = await import("@vueda/utils/fieldMappings.js");

            const props = makeBaseProps({
                fields: ["title"],
                fieldDetails: {
                    title: {
                        name: "title",
                        typeSerializer: "CharField",
                        many: false,
                        readOnly: false,
                    },
                },
            });

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect(state.fieldComponents.title).toStrictEqual(availableFields.FormField);
            expect(state.widgetComponents.title).toStrictEqual(defaultFieldMappings.CharField.CharField.widget);
        });
        scopedIt("resolves FormField for unknown typeModel but throws for widget", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");
            const { availableFields } = await import("@vueda/utils/formLookups.js");

            const props = makeBaseProps({
                fields: ["title"],
                fieldDetails: {
                    title: {
                        name: "title",
                        typeSerializer: "CharField",
                        typeModel: "UnknownFieldType",
                        many: false,
                        readOnly: false,
                    },
                },
            });

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect(state.fieldComponents.title).toStrictEqual(availableFields.FormField);
            expect(() => state.widgetComponents.title).toThrow(
                'No widget component found for field "title" in app "foo" model "bar"',
            );
        });
        scopedIt("uses choice field component when choices provided", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");
            const { availableFields } = await import("@vueda/utils/formLookups.js");

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

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect(state.fieldComponents.kind).toStrictEqual(availableFields.FormField);
        });
        scopedIt("uses many field / widget mappings when many=true", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");

            const props = makeBaseProps({
                fields: ["tags"],
                fieldDetails: {
                    tags: {
                        name: "tags",
                        typeSerializer: "CharField",
                        typeModel: "CharField",
                        many: true,
                        readOnly: false,
                    },
                },
            });

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect(state.fieldComponents.tags).toBeTruthy();
            expect(state.widgetComponents.tags).toBeTruthy();
            // manyFieldMappings should set default fieldProps
            expect(state.fieldProps.tags.manyComponent).toBeTruthy();
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

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect(state.fieldComponents.summary).toStrictEqual(FieldCustom);
            expect(state.widgetComponents.summary).toStrictEqual(WidgetCustom);
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

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect(state.widgetComponents.title).toStrictEqual(availableWidgets.WidgetReadOnly);
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

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;
            await flushPromises();

            expect(state.widgetComponents.status).toStrictEqual(availableWidgets.WidgetCombobox);
        });
        scopedIt("infers FieldSetStackedInline for expanded many fields", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");
            const { availableFields } = await import("@vueda/utils/formLookups.js");

            const props = makeBaseProps({
                fields: ["tags"],
                expand: ["tags"],
                fieldDetails: {
                    tags: {
                        name: "tags",
                        typeSerializer: "TagField",
                        typeModel: "TagField",
                        many: true,
                        readOnly: false,
                    },
                },
                expandDetails: {
                    tags: { f: {} },
                },
            });

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;
            modelConfig.config.expandDetails = props.expandDetails;

            await flushPromises();

            expect(state.fieldComponents.tags).toStrictEqual(availableFields.FieldSetStackedInline);
        });
        scopedIt("resolves field component names passed as strings", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");
            const { availableFields } = await import("@vueda/utils/formLookups.js");

            const props = makeBaseProps({
                fields: ["title"],
                fieldDetails: {
                    title: {
                        name: "title",
                        typeSerializer: "CharField",
                        typeModel: "CharField",
                        many: false,
                        readOnly: false,
                    },
                },
                fieldComponents: {
                    title: "FieldSetTabularInline",
                },
            });

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect(state.fieldComponents.title).toStrictEqual(availableFields.FieldSetTabularInline);
        });
        scopedIt("resolves widget names from props", async () => {
            const { availableWidgets } = await import("@vueda/utils/formLookups.js");
            const { useFormModel } = await import("@vueda/use/useFormModel.js");

            const props = makeBaseProps({
                fields: ["notes"],
                fieldDetails: {
                    notes: {
                        name: "notes",
                        typeSerializer: "CharField",
                        typeModel: "CharField",
                        many: false,
                        readOnly: false,
                    },
                },
                widgetComponents: {
                    notes: "WidgetTextarea",
                },
            });

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;

            await flushPromises();

            expect(state.widgetComponents.notes).toStrictEqual(availableWidgets.WidgetTextarea);
        });
        scopedIt("returns null widget for base expanded fields", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");

            const props = makeBaseProps({
                fields: ["dep"],
                expand: ["dep"],
                fieldDetails: {
                    dep: {
                        name: "dep",
                        typeSerializer: "CharField",
                        typeModel: "CharField",
                        many: false,
                        readOnly: false,
                    },
                },
                expandDetails: {
                    dep: { f: {} },
                },
            });

            const state = await withSetup(() => useFormModel(props));
            modelConfig.config.fieldDetails = props.fieldDetails;
            modelConfig.config.expandDetails = props.expandDetails;

            await flushPromises();

            expect(state.widgetComponents.dep).toBe(null);
        });
    });
    describe("error handling for misconfigured fields", () => {
        scopedIt("throws on unknown field", async () => {
            const { useFormModel } = await import("@vueda/use/useFormModel.js");

            const props = vue.reactive({
                app: "foo",
                model: "bar",
                view: "create",
                fields: ["bogus"],
                expand: [],
                fieldDetails: {},
                expandDetails: {},
            });
            await withSetup(() => useFormModel(props));
            let errorThrown = null;
            try {
                await withSetup(() => useFormModel(props));
                modelConfig.config.fieldDetails = { test: {} };
                await vue.nextTick();
            } catch (err) {
                errorThrown = err;
            }

            expect(errorThrown.message).toBe("Unknown field bogus specified for foo.bar");
        });
    });
    describe("setWidgetComponentProps", () => {
        scopedIt("buildForm setWidgetComponentProps handles choice props for base field", async () => {
            const { buildForm } = await import("@vueda/utils/buildForm.js");
            const vue = await import("vue");

            const props = vue.reactive({
                app: "foo",
                model: "bar",
                view: "create",
                widgetProps: {},
                fieldProps: {},
            });
            const state = vue.reactive({ computedFields: [] });

            const getWidgetProps = vi.fn(() => false);

            const { setWidgetComponentProps } = buildForm(
                props,
                state,
                () => {},
                () => {},
                () => {},
                getWidgetProps,
            );

            const detail = {
                choices: true,
                appLabel: "baz",
                model: "Thing",
                readOnly: false,
            };

            const widget = setWidgetComponentProps("status", detail);

            expect(widget.value).toEqual({
                fieldApp: "foo",
                fieldModel: "bar",
                app: "baz",
                model: "Thing",
                fieldName: "status",
                themeOverride: undefined,
                readOnly: false,
            });
            expect(getWidgetProps).toHaveBeenCalledWith(detail);
            expect(widget.value).not.toHaveProperty("options");
        });
        scopedIt("buildForm setWidgetComponentProps handles choice props for expanded field", async () => {
            const { buildForm } = await import("@vueda/utils/buildForm.js");
            const vue = await import("vue");

            const props = vue.reactive({
                app: "foo",
                model: "bar",
                view: "create",
                widgetProps: {},
                fieldProps: {},
            });
            const state = vue.reactive({ computedFields: [] });

            const getWidgetProps = vi.fn(() => false);

            const { setWidgetComponentProps } = buildForm(
                props,
                state,
                () => {},
                () => {},
                () => {},
                getWidgetProps,
            );

            const detail = {
                choices: true,
                appLabel: "baz",
                model: "Thing",
                readOnly: false,
            };

            const expandField = {
                expandDetail: { appLabel: "app", model: "Model" },
                expandFieldName: "title",
            };

            const widget = setWidgetComponentProps("department__title", detail, true, expandField);

            expect(widget.value).toEqual({
                fieldApp: "app",
                fieldModel: "Model",
                app: "baz",
                model: "Thing",
                fieldName: "title",
                themeOverride: undefined,
                readOnly: false,
            });
            expect(getWidgetProps).toHaveBeenCalledWith(detail);
            expect(widget.value).not.toHaveProperty("options");
        });
    });
});
