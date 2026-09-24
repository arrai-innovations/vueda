import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";
import FieldSetSingularStackedInline from "@vueda/form/field-set/FieldSetSingularStackedInline.vue";
import FieldSetStackedInline from "@vueda/form/field-set/FieldSetStackedInline.vue";
import FieldSetTabularInline from "@vueda/form/field-set/FieldSetTabularInline.vue";
import FormField from "@vueda/form/form-model/FormField.vue";
import { useForm } from "@vueda/use/useForm.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
import { defineComponent, h, provide, reactive } from "vue";

// Keep metadata offline and select the grid layout; use real buttons, inlines,
// row operations, and field validation inside a native form.
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: () => ({ config: { expand: ["lines"], expandDetails: { lines: { f: {} } } } }),
}));
let isTable = true;
vi.mock("@vueuse/core", async (importOriginal) => ({
    ...(await importOriginal()),
    useBreakpoints: () => ({ greaterOrEqual: () => ({ value: isTable }) }),
}));

const layouts = [
    { name: "stacked", component: FieldSetStackedInline },
    { name: "singular stacked", component: FieldSetSingularStackedInline, singular: true },
    { name: "tabular table", component: FieldSetTabularInline },
    { name: "tabular cards", component: FieldSetTabularInline, cards: true },
];

describe("lib/form/field-set/FieldSet*Inline*.vue", () => {
    describe("local row edits inside a form", () => {
        scopedIt.each(layouts)("$name Create and Delete do not submit or validate unrelated fields", async (layout) => {
            isTable = !layout.cards;
            let form;
            const submit = vi.fn((event) => {
                event.preventDefault();
                form.setAllTouched();
            });
            const wrapper = mount(
                defineComponent({
                    setup() {
                        form = useForm(
                            reactive({ initialValues: { reference: "", lines: layout.singular ? null : [] } }),
                        );
                        provide(FormModelSymbol, { fields: [], expand: ["lines"] });
                        return () =>
                            h("form", { onSubmit: submit }, [
                                h(FormField, { name: "reference", label: "Reference", required: true }, () =>
                                    h(WidgetTextInput),
                                ),
                                h(layout.component, {
                                    name: "lines",
                                    label: "Lines",
                                    required: false,
                                    autoCreateWhenEmpty: false,
                                    fieldObjects: [],
                                }),
                                h("button", { type: "submit" }, "Save"),
                            ]);
                    },
                }),
                { attachTo: document.body },
            );
            try {
                await flushPromises();
                const button = (label) => wrapper.findAll("button").find((candidate) => candidate.text() === label);
                expect(form.state.touched).toEqual({});
                expect(form.state.errors).toEqual({});

                button("Create").element.click();
                await flushPromises();
                expect(form.state.values.lines).toEqual(layout.singular ? {} : [{}]);
                expect(submit).not.toHaveBeenCalled();
                expect(form.state.submitted).toBe(false);
                expect(form.state.touched.reference).toBeUndefined();
                expect(form.state.errors).toEqual({});

                button("Delete").element.click();
                await flushPromises();
                expect(form.state.values.lines).toEqual(layout.singular ? null : []);
                expect(submit).not.toHaveBeenCalled();
                expect(form.state.submitted).toBe(false);
                expect(form.state.touched.reference).toBeUndefined();
                expect(form.state.errors).toEqual({});

                // Prove that native submission and required validation are active.
                button("Save").element.click();
                await flushPromises();
                expect(submit).toHaveBeenCalledOnce();
                expect(form.state.touched.reference).toBe(true);
                expect(form.state.errors.reference.required).toBe("This field is required.");
            } finally {
                wrapper.unmount();
                wrapper.element.remove();
            }
        });
    });
});
