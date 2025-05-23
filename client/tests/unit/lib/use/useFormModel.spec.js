import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";

describe("lib/use/useFormModel.js", () => {
    beforeEach(() => {
        vi.doMock("@vueda/use/useModelConfig", () => ({
            useModelConfig: vi.fn(() => ({ config: {} })),
        }));
        vi.doMock("@vueda/use/useTheme.js", () => ({
            mergeTheme: (...themes) => Object.assign({}, ...themes),
            useTheme: vi.fn(() => ({})),
        }));
    });

    afterEach(() => {
        vi.resetAllMocks();
        vi.resetModules();
    });

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
});
