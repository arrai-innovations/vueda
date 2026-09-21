import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";
import FieldSetMany from "@vueda/form/field-set/FieldSetMany.vue";
import FormField from "@vueda/form/form-model/FormField.vue";
import { useForm } from "@vueda/use/useForm.js";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
import { defineComponent, h, reactive } from "vue";

function renderMany(values, props = {}, widget = WidgetTextInput) {
    let form;
    const wrapper = mount(
        defineComponent({
            setup() {
                form = useForm(reactive({ initialValues: { emails: values } }));
                return () =>
                    h(
                        FieldSetMany,
                        {
                            name: "emails",
                            label: "Emails",
                            required: false,
                            manyComponent: FormField,
                            ...props,
                        },
                        () => h(widget),
                    );
            },
        }),
    );
    return {
        wrapper,
        get form() {
            return form;
        },
    };
}
const removeButtons = (wrapper) => wrapper.findAll('[data-qa="field-set-many-remove"] button');
const addButton = (wrapper) => wrapper.get('[data-qa="field-set-many-footer"] button');

describe("lib/form/field-set/FieldSetMany.vue", () => {
    describe("form integration", () => {
        scopedIt("adds to an empty optional list and removes any entry back to an empty array", async () => {
            const { wrapper, form } = renderMany([]);
            await flushPromises();
            expect(wrapper.findAll("input")).toHaveLength(0);
            for (const value of ["first@domain.invalid", "second@domain.invalid", "third@domain.invalid"]) {
                await addButton(wrapper).trigger("click");
                await wrapper.findAll("input").at(-1).setValue(value);
            }
            await removeButtons(wrapper)[0].trigger("click");
            expect(form.state.values.emails).toEqual(["second@domain.invalid", "third@domain.invalid"]);
            expect(wrapper.findAll("input").map((el) => el.element.value)).toEqual(form.state.values.emails);
            await removeButtons(wrapper)[1].trigger("click");
            await removeButtons(wrapper)[0].trigger("click");
            await flushPromises();
            expect(form.state.values.emails).toEqual([]);
            expect(form.state.submittingValues.emails).toEqual([]);
            expect(wrapper.findAll("input")).toHaveLength(0);
            expect(form.state.errors).toEqual({});
        });

        scopedIt("validates every added entry, including the first", async () => {
            const { wrapper, form } = renderMany([]);
            await addButton(wrapper).trigger("click");
            form.setAllTouched();
            const input = wrapper.get("input");
            await input.trigger("focus");
            await input.trigger("blur");
            await flushPromises();
            expect(form.state.errors["emails[0]"].required).toBe("This field is required.");
            expect(wrapper.text()).toContain("This field is required.");
            await input.setValue("first@domain.invalid");
            await flushPromises();
            expect(form.state.errors).toEqual({});
        });

        scopedIt("keeps zero and false as valid required entries", async () => {
            const { form } = renderMany([0, false], { required: true }, "span");
            await flushPromises();
            form.setAllTouched();
            await flushPromises();
            expect(form.state.errors).toEqual({});
            expect(form.state.submittingValues.emails).toEqual([0, false]);
        });

        scopedIt("applies a custom list requirement without applying it to each entry", async () => {
            const { wrapper, form } = renderMany(["first@domain.invalid"], {
                required: true,
                isRequiredViolation: (value) => value.length < 2,
            });
            await flushPromises();
            form.setAllTouched();
            await flushPromises();
            expect(form.state.errors.emails?.required).toBeTruthy();
            expect(form.state.errors["emails[0]"]).toBeUndefined();
            await addButton(wrapper).trigger("click");
            await wrapper.findAll("input")[1].setValue("second@domain.invalid");
            await flushPromises();
            expect(form.state.errors).toEqual({});
        });

        scopedIt("validates an initially empty required list on a submission attempt", async () => {
            const { wrapper, form } = renderMany([], { required: true });
            await flushPromises();
            form.setAllTouched();
            await flushPromises();
            expect(form.state.errors.emails?.required).toBe("This field is required.");
            expect(wrapper.text()).toContain("This field is required.");
        });

        scopedIt("lets a required list become empty and reports the list-level requirement", async () => {
            const { wrapper, form } = renderMany(["first@domain.invalid"], { required: true });
            await flushPromises();
            await removeButtons(wrapper)[0].trigger("click");
            await flushPromises();
            expect(form.state.values.emails).toEqual([]);
            expect(form.state.errors.emails.required).toBe("This field is required.");
            expect(wrapper.text()).toContain("This field is required.");
            await addButton(wrapper).trigger("click");
            await wrapper.get("input").setValue("replacement@domain.invalid");
            await flushPromises();
            expect(form.state.errors).toEqual({});
        });

        scopedIt("moves indexed feedback and touched state with survivors, without leaving tail errors", async () => {
            const { wrapper, form } = renderMany(["first@domain.invalid", "", "third@domain.invalid"]);
            await flushPromises();
            form.setAllTouched();
            form.setTouched("emails[1]");
            form.updateMessage("emails[2]", "warning", "Check this address");
            form.setTouched("emails[2]");
            form.updateError("other", "validate", "Unrelated");
            await flushPromises();
            expect(form.state.errors["emails[1]"].required).toBeTruthy();
            await removeButtons(wrapper)[0].trigger("click");
            await flushPromises();
            expect(form.state.errors["emails[0]"].required).toBeTruthy();
            expect(form.state.messages["emails[1]"].warning).toBe("Check this address");
            expect(form.state.touched["emails[0]"]).toBe(true);
            expect(form.state.touched["emails[2]"]).toBeUndefined();
            expect(form.state.errors["emails[1]"]).toBeUndefined();
            expect(form.state.errors["emails[2]"]).toBeUndefined();
            await removeButtons(wrapper)[0].trigger("click");
            await removeButtons(wrapper)[0].trigger("click");
            await flushPromises();
            expect(form.state.errors).toEqual({ other: { validate: "Unrelated" } });
            expect(form.state.messages).toEqual({});
        });

        scopedIt("updates individual values through contextless v-model and removes the last row", async () => {
            const state = reactive({ emails: ["first@domain.invalid"] });
            const wrapper = mount(
                defineComponent({
                    setup: () => () =>
                        h(
                            FieldSetMany,
                            {
                                name: "emails",
                                contextless: true,
                                required: false,
                                manyComponent: FormField,
                                modelValue: state.emails,
                                "onUpdate:modelValue": (value) => {
                                    state.emails = value;
                                },
                            },
                            () => h(WidgetTextInput),
                        ),
                }),
            );
            await wrapper.get("input").setValue("changed@domain.invalid");
            expect(state.emails).toEqual(["changed@domain.invalid"]);
            await removeButtons(wrapper)[0].trigger("click");
            expect(state.emails).toEqual([]);
            expect(wrapper.findAll("input")).toHaveLength(0);
        });

        scopedIt("disables add and every remove action for read-only lists", async () => {
            const { wrapper, form } = renderMany(["first@domain.invalid"], { readOnly: true });
            expect(addButton(wrapper).element.disabled).toBe(true);
            expect(removeButtons(wrapper)[0].element.disabled).toBe(true);
            await addButton(wrapper).trigger("click");
            await removeButtons(wrapper)[0].trigger("click");
            expect(form.state.values.emails).toEqual(["first@domain.invalid"]);
        });
    });
});
