import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";
import FieldSetMany from "@vueda/form/field-set/FieldSetMany.vue";
import FieldRenderer from "@vueda/form/form-model/FieldRenderer.vue";
import FormField from "@vueda/form/form-model/FormField.vue";
import { useForm } from "@vueda/use/useForm.js";
import ActionForm from "@vueda/views/ActionForm.vue";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
import { createPinia } from "pinia";
import { defineComponent, h, reactive, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

// Keep the real form context, fields, widgets, and validation summary. Only the
// application's own toast, metadata, and error reporting are isolated.
vi.mock("@arrai-innovations/vue-sonner", () => ({
    toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));
vi.mock("@vueda/use/useModelConfig", () => ({ useModelConfig: () => ({ config: { actionRedirects: {} } }) }));
vi.mock("@sentry/vue", () => ({ captureException: vi.fn() }));

const summarySelector = '[data-qa="action-form-validation"]';
const summaryFields = (wrapper) =>
    wrapper.findAll('[data-qa="action-form-validation-field"]').map((field) => field.text());

/**
 * Mounts a real ActionForm over a real form context, with `renderFields` supplying the
 * fields inside the `action-form-inner` slot. Returns the form so a test can feed it the
 * server's rejection directly.
 */
async function renderActionForm(renderFields, initialValues) {
    let form;
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/", component: { template: "<div />" } }],
    });
    await router.push("/");
    const wrapper = mount(
        defineComponent({
            setup() {
                form = useForm(reactive({ initialValues }));
                return () =>
                    h(
                        ActionForm,
                        { app: "auth", model: "user", action: "sign_in", hasInput: true, requireModified: false },
                        { "action-form-inner": renderFields },
                    );
            },
        }),
        { attachTo: document.body, global: { plugins: [createPinia(), router] } },
    );
    await flushPromises();
    return { wrapper, form };
}

describe("lib/views/ActionForm.vue", () => {
    let errorSpy;
    beforeEach(() => {
        errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
        errorSpy.mockRestore();
    });

    describe("validation summary (form integration)", () => {
        scopedIt("reports a rejected field once, under the field, with no summary", async () => {
            const { wrapper, form } = await renderActionForm(
                () => [
                    h(FormField, { name: "email", label: "Email" }, () => h(WidgetTextInput)),
                    h(FormField, { name: "password", label: "Password" }, () => h(WidgetTextInput)),
                ],
                { email: "developer", password: "secret" },
            );
            try {
                form.handleServerFormValidationError({
                    errors: { email: "Enter a valid email address." },
                    messages: {},
                });
                form.setAllTouched();
                await flushPromises();

                expect(wrapper.text().split("Enter a valid email address.")).toHaveLength(2);
                expect(wrapper.find(summarySelector).exists()).toBe(false);
                expect(wrapper.get('[data-qa="form-field"]').text()).toContain("Enter a valid email address.");
            } finally {
                wrapper.unmount();
            }
        });

        scopedIt("keeps an error on a hidden field in the summary and drops one a visible field shows", async () => {
            const { wrapper, form } = await renderActionForm(
                () => [
                    h(FormField, { name: "email", label: "Email" }, () => h(WidgetTextInput)),
                    h(FormField, { name: "token", label: "Token", hidden: true }, () => h(WidgetTextInput)),
                ],
                { email: "developer", token: "" },
            );
            try {
                form.handleServerFormValidationError({
                    errors: { email: "Enter a valid email address.", token: "This token has expired." },
                    messages: {},
                });
                form.setAllTouched();
                await flushPromises();

                expect(summaryFields(wrapper)).toEqual(["Token"]);
                expect(wrapper.get(summarySelector).text()).toContain("This token has expired.");
                expect(wrapper.get(summarySelector).text()).not.toContain("Enter a valid email address.");
                // The hidden field renders its widget alone, so the summary is its error's only surface.
                expect(wrapper.text().split("This token has expired.")).toHaveLength(2);
            } finally {
                wrapper.unmount();
            }
        });

        scopedIt("keeps an error on a field whose renderer failed and on a key the form does not render", async () => {
            const boomWidget = defineComponent({
                name: "BoomWidget",
                setup: () => () => {
                    throw new Error("widget blew up");
                },
            });
            const formModel = reactive({
                theme: {},
                fieldComponents: { reference: FormField },
                widgetComponents: { reference: boomWidget },
                fieldDetails: { reference: { label: "Reference" } },
                fieldProps: { reference: { label: "Reference" } },
                widgetProps: {},
            });
            const { wrapper, form } = await renderActionForm(
                () => [
                    h(FormField, { name: "email", label: "Email" }, () => h(WidgetTextInput)),
                    h(FieldRenderer, { formModelName: "reference", formModel }),
                ],
                { email: "developer", reference: "" },
            );
            try {
                expect(wrapper.find('[data-qa="field-renderer-error"]').exists()).toBe(true);
                form.handleServerFormValidationError({
                    errors: {
                        email: "Enter a valid email address.",
                        reference: "This reference is unknown.",
                        legacy_flag: "This flag is no longer supported.",
                    },
                    messages: {},
                });
                form.setAllTouched();
                await flushPromises();

                expect(summaryFields(wrapper)).toEqual(["reference", "legacy_flag"]);
                expect(wrapper.get(summarySelector).text()).toContain("This reference is unknown.");
                expect(wrapper.get(summarySelector).text()).toContain("This flag is no longer supported.");
            } finally {
                wrapper.unmount();
            }
        });

        scopedIt("renders the summary before the first field and keeps form-scope errors above it", async () => {
            const { wrapper, form } = await renderActionForm(
                () => [h(FormField, { name: "token", label: "Token", hidden: true }, () => h(WidgetTextInput))],
                { token: "" },
            );
            try {
                form.handleServerFormValidationError({
                    errors: { token: "This token has expired.", non_field_errors: "Unable to sign in." },
                    messages: {},
                });
                form.setAllTouched();
                await flushPromises();

                const summary = wrapper.get(summarySelector).element;
                const field = wrapper.get('[data-qa="form-field"]').element;
                const nonFieldAlert = wrapper.get('[role="alert"]:not([data-qa="action-form-validation"])').element;
                expect(nonFieldAlert.textContent).toContain("Unable to sign in.");
                expect(summary.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
                expect(nonFieldAlert.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            } finally {
                wrapper.unmount();
            }
        });

        scopedIt("shows no summary when the only errors are form-scope errors", async () => {
            const { wrapper, form } = await renderActionForm(
                () => [h(FormField, { name: "email", label: "Email" }, () => h(WidgetTextInput))],
                { email: "person@domain.invalid" },
            );
            try {
                form.handleServerFormValidationError({
                    errors: { non_field_errors: "Unable to sign in." },
                    messages: {},
                });
                form.setAllTouched();
                await flushPromises();

                expect(wrapper.text()).toContain("Unable to sign in.");
                expect(wrapper.find(summarySelector).exists()).toBe(false);
            } finally {
                wrapper.unmount();
            }
        });
        scopedIt(
            "drops errors a field set and its entries show, and keeps one on an entry it does not render",
            async () => {
                const { wrapper, form } = await renderActionForm(
                    () => [
                        h(
                            FieldSetMany,
                            { name: "emails", label: "Emails", required: false, manyComponent: FormField },
                            () => h(WidgetTextInput),
                        ),
                    ],
                    { emails: ["developer", "person@domain.invalid"] },
                );
                try {
                    form.handleServerFormValidationError({
                        errors: {
                            emails: "Remove the duplicate addresses.",
                            "emails[0]": "Enter a valid email address.",
                            "emails[5]": "This address was removed on the server.",
                        },
                        messages: {},
                    });
                    form.setAllTouched();
                    await flushPromises();

                    // The list-level error shows in the field set's own message block and the entry error
                    // under its entry, so only the error on an entry the set does not render remains.
                    expect(summaryFields(wrapper)).toEqual(["emails[5]"]);
                    expect(wrapper.text().split("Remove the duplicate addresses.")).toHaveLength(2);
                    expect(wrapper.text().split("Enter a valid email address.")).toHaveLength(2);
                    expect(wrapper.get('[data-qa="field-set-many"]').text()).toContain("Enter a valid email address.");
                } finally {
                    wrapper.unmount();
                }
            },
        );

        scopedIt(
            "moves a field's error into the summary while the field is unmounted, and back out on remount",
            async () => {
                const showEmail = ref(true);
                const { wrapper, form } = await renderActionForm(
                    () => [
                        showEmail.value
                            ? h(FormField, { name: "email", label: "Email" }, () => h(WidgetTextInput))
                            : null,
                        h(FormField, { name: "password", label: "Password" }, () => h(WidgetTextInput)),
                    ],
                    { email: "developer", password: "secret" },
                );
                try {
                    form.handleServerFormValidationError({
                        errors: { email: "Enter a valid email address." },
                        messages: {},
                    });
                    form.setAllTouched();
                    await flushPromises();
                    expect(wrapper.find(summarySelector).exists()).toBe(false);

                    showEmail.value = false;
                    await flushPromises();
                    // No rendered field reports a label for the key either, so the row names it by key.
                    expect(summaryFields(wrapper)).toEqual(["email"]);
                    expect(wrapper.get(summarySelector).text()).toContain("Enter a valid email address.");

                    showEmail.value = true;
                    await flushPromises();
                    expect(wrapper.find(summarySelector).exists()).toBe(false);
                    expect(wrapper.text().split("Enter a valid email address.")).toHaveLength(2);
                } finally {
                    wrapper.unmount();
                }
            },
        );
    });
});
