import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";
import FormField from "@vueda/form/form-model/FormField.vue";
import { useForm } from "@vueda/use/useForm.js";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
import { defineComponent, h, reactive } from "vue";

/**
 * Label registration exercised through real mounted field components, rather than a mocked
 * form context: the behaviors here (a replaced component instance, a renamed field) depend on
 * actual Vue mount/unmount ordering that a hand-invoked unmount callback does not reproduce.
 */
describe("lib/use/useField.js", () => {
    describe("label registration (form integration)", () => {
        scopedIt("keeps a replaced field's label registered when the outgoing instance unmounts", async () => {
            let form;
            const renderState = reactive({ key: "a" });
            mount(
                defineComponent({
                    setup() {
                        form = useForm(reactive({ initialValues: { email: "" } }));
                        return () =>
                            h(FormField, { key: renderState.key, name: "email", label: "Email" }, () =>
                                h(WidgetTextInput),
                            );
                    },
                }),
            );
            await flushPromises();
            expect(form.state.labels).toEqual({ email: "Email" });

            // A changed `key` forces Vue to replace the component instance under the same field
            // name, rather than reuse it: the case where an outgoing instance's cleanup could
            // otherwise delete an incoming instance's registration for the same name.
            renderState.key = "b";
            await flushPromises();

            expect(form.state.labels).toEqual({ email: "Email" });
        });

        scopedIt("re-registers under the new name when a mounted field's name prop changes", async () => {
            let form;
            const renderState = reactive({ name: "billing_email" });
            const wrapper = mount(
                defineComponent({
                    setup() {
                        form = useForm(reactive({ initialValues: { billing_email: "", shipping_email: "" } }));
                        return () => h(FormField, { name: renderState.name, label: "Email" }, () => h(WidgetTextInput));
                    },
                }),
            );
            await flushPromises();
            expect(form.state.labels).toEqual({ billing_email: "Email" });

            renderState.name = "shipping_email";
            await flushPromises();
            expect(form.state.labels).toEqual({ shipping_email: "Email" });

            wrapper.unmount();
            await flushPromises();
            expect(form.state.labels).toEqual({});
        });
    });

    describe("validate prop (form integration)", () => {
        const mountValidatedField = async (validate) => {
            let form;
            mount(
                defineComponent({
                    setup() {
                        form = useForm(reactive({ initialValues: { quantity: -1 } }));
                        return () =>
                            h(FormField, { name: "quantity", label: "Quantity", validate }, () => h(WidgetTextInput));
                    },
                }),
            );
            await flushPromises();
            form.setAllTouched();
            await flushPromises();
            return form;
        };

        scopedIt("writes a returned string as the field's validate error", async () => {
            const form = await mountValidatedField((value) => (value > 0 ? true : "Must be positive"));

            expect(form.state.errors.quantity).toEqual({ validate: "Must be positive" });
            expect(form.state.valid.quantity).toBe("Must be positive");
        });

        scopedIt("writes the default message when validate returns false", async () => {
            const form = await mountValidatedField(() => false);

            expect(form.state.errors.quantity).toEqual({ validate: "Validation Failed" });
        });

        scopedIt("writes no validate error when validate returns true", async () => {
            const form = await mountValidatedField(() => true);

            expect(form.state.errors.quantity?.validate).toBeUndefined();
            expect(form.state.valid.quantity).toBe(true);
        });
    });

    describe("disabled widget (form integration)", () => {
        scopedIt("marks the field shell disabled while its widget is disabled", async () => {
            const renderState = reactive({ disabled: true });
            const wrapper = mount(
                defineComponent({
                    setup() {
                        useForm(reactive({ initialValues: { email: "" } }));
                        return () =>
                            h(FormField, { name: "email", label: "Email" }, () =>
                                h(WidgetTextInput, { disabled: renderState.disabled }),
                            );
                    },
                }),
            );
            await flushPromises();
            expect(wrapper.get('[data-qa="form-field"]').attributes("data-disabled")).toBe("true");

            renderState.disabled = false;
            await flushPromises();
            expect(wrapper.get('[data-qa="form-field"]').attributes("data-disabled")).toBeUndefined();
        });
    });
});
