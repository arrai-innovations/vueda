import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";
import FieldSetSingularStackedInline from "@vueda/form/field-set/FieldSetSingularStackedInline.vue";
import FieldSetStackedInline from "@vueda/form/field-set/FieldSetStackedInline.vue";
import FieldSetTabularInline from "@vueda/form/field-set/FieldSetTabularInline.vue";
import { useForm } from "@vueda/use/useForm.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import ActionForm from "@vueda/views/ActionForm.vue";
import { createPinia } from "pinia";
import { defineComponent, h, provide, reactive } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

// Keep the real form context, inline field sets, Collapsible components, fields, and validation
// summary. Only model metadata, field selection, toasts, and error reporting are isolated.
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: () => ({
        config: { expand: ["lines"], expandDetails: { lines: { f: {} } }, actionRedirects: {} },
    }),
}));
let isTable = true;
vi.mock("@vueuse/core", async (importOriginal) => ({
    ...(await importOriginal()),
    useBreakpoints: () => ({ greaterOrEqual: () => ({ value: isTable }) }),
}));
vi.mock("@vueda/form/form-model/FieldRenderer.vue", async () => {
    const { defineComponent, h } = await import("vue");
    const { default: FormField } = await import("@vueda/form/form-model/FormField.vue");
    const { default: WidgetTextInput } = await import("@vueda/widgets/WidgetTextInput.vue");
    return {
        default: defineComponent({
            props: ["fieldsetStackedInlineProps", "objectGridFieldSlotProps"],
            setup: (props) => () => {
                const index = props.fieldsetStackedInlineProps?.index ?? props.objectGridFieldSlotProps?.rowIndex;
                const name = index === undefined ? "lines.note" : `lines[${index}].note`;
                return h(FormField, { name, label: "Note" }, () => h(WidgetTextInput));
            },
        }),
    };
});
vi.mock("@arrai-innovations/vue-sonner", () => ({
    toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));
vi.mock("@sentry/vue", () => ({ captureException: vi.fn() }));

const layouts = [
    { name: "stacked", component: FieldSetStackedInline },
    { name: "singular stacked", component: FieldSetSingularStackedInline, singular: true },
    { name: "tabular table", component: FieldSetTabularInline },
    { name: "tabular cards", component: FieldSetTabularInline, cards: true },
];

const summarySelector = '[data-qa="action-form-validation"]';
const summaryFields = (wrapper) =>
    wrapper.findAll('[data-qa="action-form-validation-field"]').map((field) => field.text());
const trigger = (wrapper) => wrapper.get('[data-slot="collapsible-trigger"]');

/**
 * Mounts a real ActionForm whose fields are one inline field set with a single row.
 */
async function renderInlineActionForm(layout) {
    isTable = !layout.cards;
    let form;
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/", component: { template: "<div />" } }],
    });
    await router.push("/");
    const wrapper = mount(
        defineComponent({
            setup() {
                form = useForm(
                    reactive({ initialValues: { lines: layout.singular ? { note: "Draft" } : [{ note: "Draft" }] } }),
                );
                provide(FormModelSymbol, { fields: [], expand: ["lines"] });
                return () =>
                    h(
                        ActionForm,
                        { app: "sales", model: "order", action: "submit", hasInput: true, requireModified: false },
                        {
                            "action-form-inner": () =>
                                h(layout.component, {
                                    name: "lines",
                                    label: "Lines",
                                    required: false,
                                    autoCreateWhenEmpty: false,
                                    hiddenByDefault: "never",
                                    fieldObjects: [{ name: "lines.note", fieldName: "note" }],
                                }),
                        },
                    );
            },
        }),
        { attachTo: document.body, global: { plugins: [createPinia(), router] } },
    );
    onTestFinished(() => {
        wrapper.unmount();
        wrapper.element.remove();
    });
    await flushPromises();
    return { wrapper, form, rowPath: layout.singular ? "lines.note" : "lines[0].note" };
}

describe("lib/views/ActionForm.vue", () => {
    beforeAll(() => {
        Element.prototype.scrollIntoView = vi.fn();
    });
    afterAll(() => {
        delete Element.prototype.scrollIntoView;
    });

    describe("validation summary with inline field sets", () => {
        scopedIt.each(layouts)(
            "$name keeps a row's error in the summary while the field set is collapsed",
            async (layout) => {
                const { wrapper, form, rowPath } = await renderInlineActionForm(layout);
                form.handleServerFormValidationError({
                    errors: { lines: "Add a delivery date to every line.", [rowPath]: "Enter a note." },
                    messages: {},
                });
                form.setAllTouched();
                await flushPromises();
                // Expanded: the row shows its own error, and the field set's own error shows in its
                // message block below the rows, so the summary has nothing to report.
                expect(wrapper.find(summarySelector).exists()).toBe(false);

                await trigger(wrapper).trigger("click");
                await flushPromises();
                expect(trigger(wrapper).attributes("aria-expanded")).toBe("false");
                // Collapsed: the row stays mounted but out of sight, so its error returns to the
                // summary. The field set's own message block stays visible outside the collapsed body.
                expect(summaryFields(wrapper)).toEqual(["Note"]);
                expect(wrapper.get(summarySelector).text()).toContain("Enter a note.");
                expect(wrapper.get(summarySelector).text()).not.toContain("Add a delivery date to every line.");
                expect(wrapper.get('[data-qa$="-chores"]').isVisible()).toBe(true);

                await trigger(wrapper).trigger("click");
                await flushPromises();
                expect(wrapper.find(summarySelector).exists()).toBe(false);
                expect(wrapper.get('[data-qa="form-field"]').text()).toContain("Enter a note.");
                expect(wrapper.text().split("Enter a note.")).toHaveLength(2);
            },
        );
    });
});
