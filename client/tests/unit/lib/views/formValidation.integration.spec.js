import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";
import Combobox from "@vueda/controls/combobox/Combobox.vue";
import FormField from "@vueda/form/form-model/FormField.vue";
import { useForm } from "@vueda/use/useForm.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useObjectForm } from "@vueda/use/useObjectForm.js";
import ActionForm from "@vueda/views/ActionForm.vue";
import DetailView from "@vueda/views/DetailView.vue";
import ViewCreate from "@vueda/views/ViewCreate.vue";
import ViewUpdate from "@vueda/views/ViewUpdate.vue";
import WidgetCombobox from "@vueda/widgets/WidgetCombobox.vue";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
import { createPinia } from "pinia";
import { defineComponent, h, reactive } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

let viewState;
// Isolate metadata and record fetching; retain real form validation, submit handlers,
// field feedback, and Reka's native form input.
vi.mock("@vueda/use/useViewCreate.js", () => ({ useViewCreate: () => viewState }));
vi.mock("@vueda/use/useViewUpdate.js", () => ({ useViewUpdate: () => viewState }));
vi.mock("@vueda/use/useDetailView.js", () => ({ useDetailView: () => viewState }));
vi.mock("@vueda/use/useLeaveUnload.js", () => ({ useLeaveUnload: () => {} }));
vi.mock("@arrai-innovations/vue-sonner", () => ({
    toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const RelationField = defineComponent({
    setup: () => () =>
        h("div", [
            h(FormField, { name: "supplier", label: "Supplier", required: true }, () =>
                h(WidgetCombobox, { optionLabel: "label", options: [{ label: "Supplier One", value: "one" }] }),
            ),
            h(FormField, { name: "email", label: "Email", required: false }, () =>
                h(WidgetTextInput, { type: "email" }),
            ),
        ]),
});
const FormModelFixture = defineComponent({
    inheritAttrs: false,
    setup: () => () => h(RelationField),
});

const views = [ViewCreate, ViewUpdate, DetailView, ActionForm];

describe("lib/{views,widgets}/*.vue", () => {
    describe("required combobox submission", () => {
        for (const View of views) {
            scopedIt(`${View.__name} shows field feedback on native submit and only submits valid values`, async () => {
                const send = vi.fn().mockResolvedValue({});
                const router = createRouter({
                    history: createMemoryHistory(),
                    routes: [{ path: "/", component: { template: "<div />" } }],
                });
                await router.push("/");
                const wrapper = mount(
                    defineComponent({
                        setup() {
                            useLookupContext();
                            const formContext = useForm(
                                reactive({ initialValues: { supplier: undefined, email: "person@domain.invalid" } }),
                            );
                            const instanceObject = {
                                state: reactive({
                                    pk: View === ViewCreate ? null : "1",
                                    pkKey: "id",
                                    object: { id: "1" },
                                    loading: false,
                                }),
                                create: send,
                                update: send,
                                clearError: vi.fn(),
                            };
                            const objectForm = useObjectForm({
                                props: reactive({ app: "catalog", model: "order", redirectAfter: null }),
                                formContext,
                                instanceObject,
                            });
                            objectForm.onSubmissionSuccess = vi.fn();
                            viewState = {
                                formContext,
                                objectForm,
                                instanceObject,
                                instance: reactive({
                                    formId: "order-form",
                                    titleStr: "Order",
                                    pageLoading: false,
                                    combinedFormProps: {},
                                    computedWidgetProps: {},
                                }),
                                actions: reactive({
                                    nonDetailActions: [],
                                    detailActions: [],
                                    availableTransitions: [],
                                }),
                            };
                            return () =>
                                h(
                                    View,
                                    {
                                        app: "catalog",
                                        model: "order",
                                        pk: "1",
                                        viewName: "update",
                                        modelValue: {},
                                        objectForm,
                                        runAction: send,
                                        hasInput: true,
                                        requireModified: false,
                                    },
                                    { "action-form-inner": () => h(RelationField) },
                                );
                        },
                    }),
                    {
                        attachTo: document.body,
                        global: {
                            plugins: [createPinia(), router],
                            stubs: {
                                FormModel: FormModelFixture,
                                PageActions: { template: "<div><slot /></div>" },
                                StickyBar: { template: "<div><slot name='primary' /><slot name='secondary' /></div>" },
                            },
                        },
                    },
                );
                try {
                    await flushPromises();
                    const form = wrapper.get("form").element;
                    const hiddenInput = wrapper.get('input[name="supplier"]').element;
                    expect(hiddenInput.required).toBe(false);
                    expect(wrapper.get('[data-qa="widget-combobox"]').attributes("aria-required")).toBe("true");
                    expect(wrapper.text()).not.toContain("This field is required.");

                    // Dispatching a submit event directly bypasses native constraint validation.
                    // requestSubmit exercises the browser gate that caused the regression.
                    form.requestSubmit();
                    await flushPromises();
                    expect(wrapper.text()).toContain("This field is required.");
                    expect(wrapper.get('[data-qa="widget-combobox"]').attributes("aria-invalid")).toBe("true");
                    expect(send).not.toHaveBeenCalled();

                    wrapper.findComponent(Combobox).vm.$emit("update:modelValue", "one");
                    await flushPromises();
                    const email = wrapper.get('input[type="email"]');
                    await email.setValue("invalid-email");
                    expect(email.element.validity.typeMismatch).toBe(true);
                    form.requestSubmit();
                    await flushPromises();
                    expect(send).not.toHaveBeenCalled();

                    await email.setValue("person@domain.invalid");
                    form.requestSubmit();
                    await flushPromises();
                    expect(wrapper.text()).not.toContain("This field is required.");
                    expect(send).toHaveBeenCalledOnce();
                    const values = { supplier: "one", email: "person@domain.invalid" };
                    expect(send.mock.calls[0][0]).toEqual(
                        expect.objectContaining(View === ActionForm ? { formValues: values } : { object: values }),
                    );
                } finally {
                    wrapper.unmount();
                }
            });
        }
    });

    describe("standalone combobox submission", () => {
        for (const contextless of [false, true]) {
            scopedIt(`retains native required validation with contextless=${contextless}`, async () => {
                const submitted = vi.fn();
                const wrapper = mount(
                    defineComponent({
                        setup() {
                            useLookupContext();
                            return () => {
                                const widget = () =>
                                    h(WidgetCombobox, {
                                        name: "supplier",
                                        contextless,
                                        required: true,
                                        optionLabel: "label",
                                        options: [{ label: "Supplier One", value: "one" }],
                                    });
                                return h(
                                    "form",
                                    {
                                        onSubmit: (event) => {
                                            event.preventDefault();
                                            submitted();
                                        },
                                    },
                                    // A contextless picker must ignore an enclosing optional field.
                                    contextless
                                        ? h(FormField, { name: "supplier", required: false }, widget)
                                        : widget(),
                                );
                            };
                        },
                    }),
                    { attachTo: document.body, global: { plugins: [createPinia()] } },
                );
                try {
                    await flushPromises();
                    const form = wrapper.get("form").element;
                    expect(wrapper.get('input[name="supplier"]').element.required).toBe(true);
                    form.requestSubmit();
                    expect(submitted).not.toHaveBeenCalled();
                    wrapper.findComponent(Combobox).vm.$emit("update:modelValue", "one");
                    await flushPromises();
                    form.requestSubmit();
                    expect(submitted).toHaveBeenCalledOnce();
                } finally {
                    wrapper.unmount();
                }
            });
        }
    });
});
