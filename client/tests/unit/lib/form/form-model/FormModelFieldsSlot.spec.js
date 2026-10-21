import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, reactive } from "vue";

// Mounts the real FormModel, FieldRenderer, and FormModelField, so the per-field slots travel the same
// path they do in an application. Only the form model state and the field and widget components are stubs.

// Resolves the label and errors slots by the same names FormField uses.
const FieldStub = defineComponent({
    name: "FieldStub",
    inheritAttrs: false,
    props: ["name"],
    setup(props, { slots }) {
        const pick = (...names) => names.map((n) => slots[n]).find(Boolean);
        return () =>
            h("div", { "data-qa": `field-${props.name}`, "data-slots": Object.keys(slots).sort().join(",") }, [
                pick(`field(${props.name})label`, "field-label")?.({}) ?? h("label", `${props.name} label`),
                slots.default?.(),
                pick(`field(${props.name})errors`, "field-errors")?.({ errors: {} }),
            ]);
    },
});

const WidgetStub = defineComponent({
    name: "WidgetStub",
    setup() {
        return () => h("span", { "data-qa": "default-widget" }, "default widget");
    },
});

const mockedUseFormModel = vi.fn();
vi.mock("@vueda/use/useFormModel.js", () => ({ useFormModel: mockedUseFormModel }));

const formModelState = (fields = ["sku", "items"]) =>
    reactive({
        fields,
        baseFieldNames: new Set(fields),
        fieldComponents: Object.fromEntries(fields.map((f) => [f, FieldStub])),
        fieldProps: Object.fromEntries(fields.map((f) => [f, { label: f }])),
        fieldDetails: Object.fromEntries(fields.map((f) => [f, {}])),
        widgetComponents: Object.fromEntries(fields.map((f) => [f, WidgetStub])),
        widgetProps: Object.fromEntries(fields.map((f) => [f, {}])),
    });

describe("lib/form/form-model/FormModel.vue #fields slot", () => {
    let FormModel, FormModelField, FieldRenderer;

    beforeEach(async () => {
        mockedUseFormModel.mockReturnValue(formModelState());
        FormModel = (await import("@vueda/form/form-model/FormModel.vue")).default;
        FormModelField = (await import("@vueda/form/form-model/FormModelField.vue")).default;
        FieldRenderer = (await import("@vueda/form/form-model/FieldRenderer.vue")).default;
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    const props = { app: "shop", model: "purchaseorder" };

    // A custom layout that wraps every field, the way a consumer lays out sections.
    const wrappedLayout =
        (component) =>
        ({ fieldNames, formModel }) =>
            [...fieldNames].map((name) =>
                h("section", { "data-qa": `section-${name}` }, [
                    h(component, { formModel, formModelName: name, key: name }),
                ]),
            );

    const perFieldSlots = {
        "widget(sku)": () => h("span", { "data-qa": "custom-widget" }, "custom widget"),
        "field(sku)label": () => h("span", { "data-qa": "custom-label" }, "custom label"),
        "field-errors": () => h("span", { "data-qa": "custom-errors" }, "custom errors"),
    };

    scopedIt("renders per-field slots in the default layout", () => {
        const wrapper = mount(FormModel, { props, slots: perFieldSlots });
        expect(wrapper.find('[data-qa="custom-widget"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="custom-label"]').exists()).toBe(true);
        expect(wrapper.findAll('[data-qa="custom-errors"]')).toHaveLength(2);
    });

    scopedIt("renders the default layout's fields unchanged when no slots are set", () => {
        const wrapper = mount(FormModel, { props });
        expect(wrapper.findAll('[data-qa="default-widget"]')).toHaveLength(2);
        expect(wrapper.find('[data-qa="field-sku"]').text()).toBe("sku labeldefault widget");
        expect(wrapper.find('[data-qa="field-sku"]').attributes("data-slots")).toBe("default");
    });

    scopedIt("forwards per-field slots into a custom layout that renders FormModelField", () => {
        const wrapper = mount(FormModel, {
            props,
            slots: { fields: wrappedLayout(FormModelField), ...perFieldSlots },
        });
        const sku = wrapper.get('[data-qa="section-sku"]');
        expect(sku.find('[data-qa="custom-widget"]').exists()).toBe(true);
        expect(sku.find('[data-qa="custom-label"]').exists()).toBe(true);
        expect(sku.find('[data-qa="custom-errors"]').exists()).toBe(true);
        const items = wrapper.get('[data-qa="section-items"]');
        expect(items.find('[data-qa="default-widget"]').exists()).toBe(true);
        expect(items.find('[data-qa="custom-errors"]').exists()).toBe(true);
    });

    scopedIt("does not forward the fields slot itself into the fields", () => {
        const wrapper = mount(FormModel, { props, slots: { fields: wrappedLayout(FormModelField) } });
        expect(wrapper.get('[data-qa="field-sku"]').attributes("data-slots")).toBe("default");
    });

    scopedIt("lets a slot passed to FormModelField win over the forwarded one", () => {
        const wrapper = mount(FormModel, {
            props,
            slots: {
                fields: ({ formModel }) =>
                    h(
                        FormModelField,
                        { formModel, formModelName: "sku" },
                        { "widget(sku)": () => h("span", { "data-qa": "direct-widget" }) },
                    ),
                ...perFieldSlots,
            },
        });
        expect(wrapper.find('[data-qa="direct-widget"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="custom-widget"]').exists()).toBe(false);
    });

    scopedIt("binds the merged field props map as all-field-props and no longer as field-props", () => {
        let scope;
        mount(FormModel, {
            props,
            slots: {
                fields: (slotProps) => {
                    scope = slotProps;
                    return h("div");
                },
            },
        });
        expect(scope).toHaveProperty("allFieldProps");
        expect(scope.allFieldProps.sku).toEqual({ label: "sku" });
        expect(scope).not.toHaveProperty("fieldProps");
        expect(scope).not.toHaveProperty("field-props");
    });

    describe("a per-field slot that names no field", () => {
        scopedIt("throws in development", () => {
            expect(() => mount(FormModel, { props, slots: { "widget(skuu)": () => h("span") } })).toThrow(
                /"widget\(skuu\)".*"skuu" is not a field/,
            );
        });

        scopedIt("warns in production and still renders the form", () => {
            vi.stubEnv("DEV", false);
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            const wrapper = mount(FormModel, { props, slots: { "field(skuu)label": () => h("span") } });
            expect(warn).toHaveBeenCalledWith(expect.stringMatching(/"field\(skuu\)label".*"skuu" is not a field/));
            expect(wrapper.findAll('[data-qa="default-widget"]')).toHaveLength(2);
        });

        scopedIt("accepts paths inside a known field, such as fieldset and row paths", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            expect(() =>
                mount(FormModel, {
                    props,
                    slots: {
                        "widget(items.name)": () => h("span"),
                        "field(items[0].name)label": () => h("span"),
                        "field(['sku'])help": () => h("span"),
                    },
                }),
            ).not.toThrow();
            expect(warn).not.toHaveBeenCalled();
        });

        scopedIt("checks once the form model's fields load", async () => {
            const state = formModelState([]);
            mockedUseFormModel.mockReturnValue(state);
            const errors = [];
            const wrapper = mount(FormModel, {
                props,
                slots: { "widget(skuu)": () => h("span") },
                global: { config: { errorHandler: (e) => errors.push(e) } },
            });
            expect(errors).toEqual([]);
            Object.assign(state, formModelState());
            await nextTick();
            await nextTick();
            expect(errors.map((e) => e.message)).toEqual([expect.stringMatching(/"skuu" is not a field/)]);
            wrapper.unmount();
        });
    });

    describe("a custom layout that renders no FormModelField", () => {
        scopedIt("throws in development when FormModel has per-field slots", () => {
            expect(() =>
                mount(FormModel, { props, slots: { fields: wrappedLayout(FieldRenderer), ...perFieldSlots } }),
            ).toThrow(/renders no FormModelField.*"widget\(sku\)"/);
        });

        scopedIt("warns in production", () => {
            vi.stubEnv("DEV", false);
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            mount(FormModel, { props, slots: { fields: wrappedLayout(FieldRenderer), ...perFieldSlots } });
            expect(warn).toHaveBeenCalledWith(expect.stringMatching(/renders no FormModelField/));
        });

        scopedIt("passes when FormModel has no per-field slots", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            expect(() =>
                mount(FormModel, {
                    props,
                    slots: { fields: wrappedLayout(FieldRenderer), "before-fields": () => h("p") },
                }),
            ).not.toThrow();
            expect(warn).not.toHaveBeenCalled();
        });
    });
});
