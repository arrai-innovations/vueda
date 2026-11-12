import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";
import FieldSetSingularStackedInline from "@vueda/form/field-set/FieldSetSingularStackedInline.vue";
import { useForm } from "@vueda/use/useForm.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, provide, reactive } from "vue";

// Isolate model metadata and field selection; retain the real form, field, inline, and row.
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: () => ({ config: { expand: ["contact"], expandDetails: { contact: { f: {} } } } }),
}));
vi.mock("@vueuse/core", async (importOriginal) => ({
    ...(await importOriginal()),
    useBreakpoints: () => ({ greaterOrEqual: () => ({ value: true }) }),
}));
vi.mock("@vueda/form/form-model/FieldRenderer.vue", async () => {
    const { defineComponent, h } = await import("vue");
    const { default: FormField } = await import("@vueda/form/form-model/FormField.vue");
    const { default: WidgetTextInput } = await import("@vueda/widgets/WidgetTextInput.vue");
    return {
        default: defineComponent({
            setup: () => () =>
                h(FormField, { name: "contact.note", label: "Note", required: false }, () => h(WidgetTextInput)),
        }),
    };
});

const noteField = { name: "contact.note", fieldName: "note" };
const saved = { id: 1, note: "Saved" };

/**
 * Mounts a real form around a singular inline. The inline starts without field objects, as it does before model
 * info loads; each test sets `inlineProps.fieldObjects` to load them.
 */
function renderInline({ required, autoCreateWhenEmpty = true, initialValues }) {
    let form;
    const formProps = reactive({ initialValues });
    const inlineProps = reactive({
        name: "contact",
        label: "Contact",
        required,
        autoCreateWhenEmpty,
        hiddenByDefault: "never",
        fieldObjects: [],
    });
    const wrapper = mount(
        defineComponent({
            setup() {
                form = useForm(formProps);
                provide(FormModelSymbol, { fields: [], expand: ["contact"] });
                return () => h("form", [h(FieldSetSingularStackedInline, inlineProps)]);
            },
        }),
        { attachTo: document.body },
    );
    onTestFinished(() => {
        wrapper.unmount();
        wrapper.element.remove();
    });
    return { wrapper, form, formProps, inlineProps };
}

const expectSavedObjectShown = ({ wrapper, form }) => {
    expect(form.state.values.contact).toEqual(saved);
    expect(form.state.initialValues.contact).toEqual(saved);
    expect(form.state.anyModified).toBe(false);
    expect(wrapper.get("input").element.value).toBe("Saved");
};

describe("lib/form/field-set/FieldSetSingularStackedInline.vue auto-create", () => {
    beforeAll(() => {
        Element.prototype.scrollIntoView = vi.fn();
    });
    afterAll(() => {
        delete Element.prototype.scrollIntoView;
    });

    describe.each([
        ["an optional", false],
        ["a required", true],
    ])("on an update form, %s inline", (_, required) => {
        scopedIt("shows the saved object when the field objects load after the record", async () => {
            const rendered = renderInline({ required, initialValues: { contact: { ...saved } } });
            await flushPromises();
            rendered.inlineProps.fieldObjects = [noteField];
            await flushPromises();

            expectSavedObjectShown(rendered);
        });

        scopedIt("shows the saved object when the field objects load before the record", async () => {
            const rendered = renderInline({ required, initialValues: {} });
            await flushPromises();
            rendered.inlineProps.fieldObjects = [noteField];
            await flushPromises();
            rendered.formProps.initialValues = { contact: { ...saved } };
            await flushPromises();

            expectSavedObjectShown(rendered);
        });

        scopedIt("keeps the saved object when the field objects change again", async () => {
            const rendered = renderInline({ required, initialValues: { contact: { ...saved } } });
            await flushPromises();
            rendered.inlineProps.fieldObjects = [noteField];
            await flushPromises();
            rendered.inlineProps.fieldObjects = [{ ...noteField }];
            await flushPromises();

            expectSavedObjectShown(rendered);
        });
    });

    describe("on a create form", () => {
        for (const [description, options] of [
            ["a required inline", { required: true, autoCreateWhenEmpty: false }],
            ["an optional inline with autoCreateWhenEmpty", { required: false, autoCreateWhenEmpty: true }],
        ]) {
            scopedIt(`auto-creates an empty object for ${description}`, async () => {
                const { wrapper, form, inlineProps } = renderInline({ ...options, initialValues: { contact: null } });
                await flushPromises();
                inlineProps.fieldObjects = [noteField];
                await flushPromises();

                expect(form.state.values.contact).toEqual({});
                expect(form.state.anyModified).toBe(false);
                expect(wrapper.find("input").exists()).toBe(true);
            });
        }

        scopedIt("leaves an optional inline without autoCreateWhenEmpty empty", async () => {
            const { wrapper, form, inlineProps } = renderInline({
                required: false,
                autoCreateWhenEmpty: false,
                initialValues: { contact: null },
            });
            await flushPromises();
            inlineProps.fieldObjects = [noteField];
            await flushPromises();

            expect(form.state.values.contact).toBeNull();
            expect(wrapper.find("input").exists()).toBe(false);
        });
    });
});
