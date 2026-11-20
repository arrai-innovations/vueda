import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";
import FieldSetSingularStackedInline from "@vueda/form/field-set/FieldSetSingularStackedInline.vue";
import { useForm } from "@vueda/use/useForm.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, provide, reactive } from "vue";

// Isolate model metadata and field selection; retain the real form, field, inline, row, and Toggle.
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
const destroyEntry = { name: "contact.destroy", fieldName: "destroy", action: true, label: "Delete" };

function renderInline({ required, value = null, fieldObjects = [noteField] }) {
    let form;
    const props = reactive({ name: "contact", label: "Contact", required, hiddenByDefault: "never", fieldObjects });
    const wrapper = mount(
        defineComponent({
            setup() {
                form = useForm(reactive({ initialValues: { contact: value } }));
                provide(FormModelSymbol, { fields: [], expand: ["contact"] });
                return () => h("form", [h(FieldSetSingularStackedInline, props)]);
            },
        }),
        { attachTo: document.body },
    );
    onTestFinished(() => {
        wrapper.unmount();
        wrapper.element.remove();
    });
    return { wrapper, form, props };
}

const buttonLabels = (wrapper) => wrapper.findAll("button").map((button) => button.text());
const destroyToggle = (wrapper) => wrapper.find('[data-slot="toggle"]');
const row = (wrapper) => wrapper.find('[data-qa="field-set-singular-stacked-inline-inline-row"]');

describe("lib/form/field-set/FieldSetSingularStackedInline.vue row removal", () => {
    beforeAll(() => {
        Element.prototype.scrollIntoView = vi.fn();
    });
    afterAll(() => {
        delete Element.prototype.scrollIntoView;
    });

    scopedIt("a required inline shows no Delete button on its auto-created unsaved row", async () => {
        const { wrapper, form, props } = renderInline({ required: true, fieldObjects: [] });
        await flushPromises();
        // Field objects arrive after mount, as they do when model info loads.
        props.fieldObjects = [noteField];
        await flushPromises();

        expect(form.state.values.contact).toEqual({});
        expect(row(wrapper).exists()).toBe(true);
        expect(buttonLabels(wrapper)).not.toContain("Delete");
    });

    scopedIt("a required inline shows no removal control on its saved row, even with a destroy entry", async () => {
        const { wrapper } = renderInline({
            required: true,
            value: { id: 1, note: "Saved" },
            fieldObjects: [noteField, destroyEntry],
        });
        await flushPromises();

        expect(row(wrapper).exists()).toBe(true);
        expect(destroyToggle(wrapper).exists()).toBe(false);
        expect(wrapper.find('input[type="checkbox"], button[role="checkbox"]').exists()).toBe(false);
        expect(buttonLabels(wrapper)).not.toContain("Delete");
    });

    scopedIt("an optional inline's Delete button clears its unsaved row", async () => {
        const { wrapper, form, props } = renderInline({ required: false, fieldObjects: [] });
        await flushPromises();
        props.fieldObjects = [noteField];
        await flushPromises();

        const del = wrapper.findAll("button").find((button) => button.text() === "Delete");
        await del.trigger("click");
        await flushPromises();

        expect(form.state.values.contact).toBeNull();
        expect(row(wrapper).exists()).toBe(false);
        expect(buttonLabels(wrapper)).toContain("Create");
    });

    scopedIt("an optional inline's destroy toggle submits its saved row as null and keeps it visible", async () => {
        const saved = { id: 1, note: "Saved" };
        const { wrapper, form } = renderInline({ required: false, value: { ...saved } });
        await flushPromises();
        expect(form.state.anyModified).toBe(false);
        expect(wrapper.find('input[type="checkbox"], button[role="checkbox"]').exists()).toBe(false);

        await destroyToggle(wrapper).trigger("click");
        await flushPromises();

        expect(destroyToggle(wrapper).attributes("aria-pressed")).toBe("true");
        expect(row(wrapper).exists()).toBe(true);
        expect(wrapper.get("input").element.value).toBe("Saved");
        expect(form.state.values.contact).toEqual(saved);
        expect(form.state.submittingValues.contact).toBeNull();
        expect(form.state.anyModified).toBe(true);

        await destroyToggle(wrapper).trigger("click");
        await flushPromises();

        expect(destroyToggle(wrapper).attributes("aria-pressed")).toBe("false");
        expect(form.state.submittingValues.contact).toEqual(saved);
        expect(form.state.anyModified).toBe(false);
    });

    scopedIt("loading a new saved value clears the destroy toggle's mark", async () => {
        const { wrapper, form } = renderInline({ required: false, value: { id: 1, note: "Saved" } });
        await flushPromises();
        await destroyToggle(wrapper).trigger("click");
        await flushPromises();

        form.updateInitialValue("contact", { id: 1, note: "Reloaded" });
        await flushPromises();

        expect(form.state.submittedAsNull).toEqual({});
        expect(destroyToggle(wrapper).attributes("aria-pressed")).toBe("false");
    });
});
