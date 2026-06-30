import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const loginMock = vi.fn();

// Mutable props the AuthorizingForm stub forwards into the action-bar slot, so
// individual tests can exercise the loading gating of the Sign In button.
let actionBarProps;

const AuthorizingFormStub = defineComponent({
    name: "AuthorizingFormStub",
    props: ["runAction", "formProps", "header", "subTitle", "actionErrorSummary", "onSubmissionSuccessHandler"],
    emits: ["form-object"],
    setup(props, { slots, emit }) {
        emit("form-object", {});
        return () =>
            h("div", [
                slots["action-form-inner"] ? slots["action-form-inner"]({}) : null,
                slots["action-bar"] ? slots["action-bar"](actionBarProps) : null,
            ]);
    },
});

const FormFieldStub = defineComponent({
    name: "FormFieldStub",
    props: ["label", "name", "hidden", "validation"],
    setup(props, { slots }) {
        return () => h("div", null, slots.default ? slots.default() : null);
    },
});

const WidgetTextInputStub = defineComponent({
    name: "WidgetTextInputStub",
    setup(_, { slots }) {
        return () => h("div", null, slots.default ? slots.default({}) : null);
    },
});

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["disabled", "type", "variant"],
    setup(props, { slots }) {
        return () => h("button", { disabled: props.disabled }, slots.default ? slots.default() : null);
    },
});

const LoadingSpinnerInlineStub = defineComponent({
    name: "LoadingSpinnerInlineStub",
    setup() {
        return () => h("span");
    },
});

vi.mock("@vueda/components/AuthorizingForm.vue", () => ({ default: AuthorizingFormStub }));
vi.mock("@vueda/components/LoadingSpinnerInline.vue", () => ({ default: LoadingSpinnerInlineStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/fields/FormField.vue", () => ({ default: FormFieldStub }));
vi.mock("@vueda/widgets/WidgetTextInput.vue", () => ({ default: WidgetTextInputStub }));
vi.mock("@vueda/stores/storeUser.js", () => ({ storeUser: () => ({ login: loginMock }) }));

let ViewSignIn;

describe("lib/views/ViewSignIn.vue", () => {
    beforeEach(async () => {
        loginMock.mockReset();
        actionBarProps = { loading: false };
        ViewSignIn = (await import("@vueda/views/ViewSignIn.vue")).default;
    });

    describe("Field and widget slots", () => {
        scopedIt("provides field and widget slots with their slot props", () => {
            const fieldSlotProps = {};
            mount(ViewSignIn, {
                slots: {
                    "field(email)": (slotProps) => {
                        fieldSlotProps.email = slotProps;
                        return h("div");
                    },
                    "field(password)": (slotProps) => {
                        fieldSlotProps.password = slotProps;
                        return h("div");
                    },
                },
            });

            expect(fieldSlotProps.email).toMatchObject({ label: "Email" });
            expect(fieldSlotProps.password).toMatchObject({ label: "Password" });

            const widgetSlotProps = {};
            const wrapper = mount(ViewSignIn, {
                slots: {
                    "widget(email)": (slotProps) => {
                        widgetSlotProps.email = slotProps;
                        return h("div");
                    },
                    "widget(password)": (slotProps) => {
                        widgetSlotProps.password = slotProps;
                        return h("div");
                    },
                },
            });

            expect(widgetSlotProps.email).toMatchObject({ required: true, autocomplete: "username" });
            expect(widgetSlotProps.password).toMatchObject({
                required: true,
                type: "password",
                autocomplete: "current-password",
            });

            expect(wrapper.findComponent(AuthorizingFormStub).exists()).toBe(true);
        });
    });

    describe("Submission", () => {
        scopedIt("calls login with email and password when submitted", async () => {
            loginMock.mockResolvedValue({ ok: true });
            const wrapper = mount(ViewSignIn);
            const runAction = wrapper.findComponent(AuthorizingFormStub).props("runAction");

            await expect(runAction({ formValues: { email: "ada@example.com", password: "secret" } })).resolves.toEqual({
                ok: true,
            });

            expect(loginMock).toHaveBeenCalledWith({ email: "ada@example.com", password: "secret" });
        });

        scopedIt("suppresses ActionForm's default success toast so useSignInFlow owns success", () => {
            // useSignInFlow shows the "Signed In" toast and redirects; without overriding the
            // success handler, ActionForm would also fire a generic "Action Succeeded" toast.
            const wrapper = mount(ViewSignIn);
            const handler = wrapper.findComponent(AuthorizingFormStub).props("onSubmissionSuccessHandler");
            expect(typeof handler).toBe("function");
            expect(handler()).toBeUndefined();
        });
    });

    describe("Action bar", () => {
        scopedIt("renders a single Sign In submit button and no cancel button", () => {
            const wrapper = mount(ViewSignIn);
            const buttons = wrapper.findAll("button");
            expect(buttons).toHaveLength(1);
            expect(wrapper.text()).toContain("Sign In");
            expect(wrapper.text()).not.toContain("Cancel");
        });

        scopedIt("leaves the Sign In button enabled when not loading so a rejected login can be retried", () => {
            // The button never gates on the form's anyError: a login failure surfaces a
            // form-scope non_field_errors error that no field edit can clear, which would
            // otherwise disable retry permanently.
            const wrapper = mount(ViewSignIn);
            expect(wrapper.get("button").attributes("disabled")).toBeUndefined();
        });

        scopedIt("disables the Sign In button while a sign-in attempt is loading", () => {
            actionBarProps = { loading: true };
            const wrapper = mount(ViewSignIn);
            expect(wrapper.get("button").attributes("disabled")).toBeDefined();
        });
    });
});
