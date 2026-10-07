import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { defineComponent, h, reactive } from "vue";

const AuthorizingFormStub = defineComponent({
    name: "AuthorizingFormStub",
    props: ["runAction", "header", "subTitle", "requireRecentLogin", "formProps", "toasts"],
    setup(props, { slots }) {
        return () =>
            h("div", { "data-qa": "authorizing-form" }, [
                slots["action-form-inner"] ? slots["action-form-inner"]({}) : null,
                slots["action-bar"] ? slots["action-bar"]({ loading: false }) : null,
            ]);
    },
});

const ViewTwoFactorAuthStub = defineComponent({
    name: "ViewTwoFactorAuthStub",
    props: ["runAction", "header", "requireRecentLogin", "toasts"],
    setup(props, { slots }) {
        return () => h("div", { "data-qa": "view-two-factor-auth" }, slots.extra ? slots.extra({}) : null);
    },
});

const FormFieldStub = defineComponent({
    name: "FormFieldStub",
    props: ["label", "name", "validation"],
    setup(props, { slots }) {
        return () =>
            h("div", { "data-qa": "form-field", "data-name": props.name }, slots.default ? slots.default() : null);
    },
});

const WidgetTextInputStub = defineComponent({
    name: "WidgetTextInputStub",
    props: ["type", "autocomplete"],
    setup(props) {
        return () => h("input", { "data-qa": "widget-text-input", type: props.type });
    },
});

const ButtonStub = defineComponent({
    name: "ButtonStub",
    setup(_, { slots }) {
        return () => h("button", { "data-qa": "prime-button" }, slots.default?.());
    },
});

const FeedbackSpinnerStub = defineComponent({
    name: "FeedbackSpinnerStub",
    setup() {
        return () => h("div", { "data-qa": "feedback-spinner" });
    },
});

const storeUserMock = vi.fn();

vi.mock("@vueda/views/AuthorizingForm.vue", () => ({ default: AuthorizingFormStub }));
vi.mock("@vueda/views/ViewTwoFactorAuth.vue", () => ({ default: ViewTwoFactorAuthStub }));
vi.mock("@vueda/form/form-model/FormField.vue", () => ({ default: FormFieldStub }));
vi.mock("@vueda/widgets/WidgetTextInput.vue", () => ({ default: WidgetTextInputStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/display/loading/LoadingSpinnerInline.vue", () => ({ default: FeedbackSpinnerStub }));
vi.mock("@vueda/stores/storeUser.js", () => ({ storeUser: () => storeUserMock() }));

let ViewReauthenticate;
let userStore;

const twoFactorForm = (wrapper) => wrapper.findComponent({ name: "ViewTwoFactorAuthStub" });
const passwordForm = (wrapper) => wrapper.findComponent({ name: "AuthorizingFormStub" });

describe("lib/views/ViewReauthenticate.vue", () => {
    beforeEach(async () => {
        storeUserMock.mockReset();
        userStore = reactive({
            authPendingFlow: null,
            reauthenticate: vi.fn().mockResolvedValue(undefined),
            twoFactorReauthenticate: vi.fn().mockResolvedValue(undefined),
        });
        storeUserMock.mockReturnValue(userStore);
        ViewReauthenticate = (await import("@vueda/views/ViewReauthenticate.vue")).default;
    });

    describe("Choosing the form", () => {
        scopedIt("renders the two-factor form when the user owes a second factor", () => {
            userStore.authPendingFlow = "mfa_reauthenticate";
            const wrapper = mount(ViewReauthenticate);

            const form = twoFactorForm(wrapper);
            expect(form.exists()).toBe(true);
            expect(passwordForm(wrapper).exists()).toBe(false);
            expect(form.props("header")).toBe("Confirm your identity");
            expect(form.props("requireRecentLogin")).toBe(true);
        });

        scopedIt("renders the password form when the user owes their password", () => {
            userStore.authPendingFlow = "reauthenticate";
            const wrapper = mount(ViewReauthenticate);

            const form = passwordForm(wrapper);
            expect(form.exists()).toBe(true);
            expect(twoFactorForm(wrapper).exists()).toBe(false);
            expect(form.props("header")).toBe("Confirm your identity");
            expect(form.props("subTitle")).toBe("Enter your password again to verify your identity.");
            expect(form.props("requireRecentLogin")).toBe(true);
            expect(wrapper.find('[data-qa="form-field"][data-name="password"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="widget-text-input"]').attributes("type")).toBe("password");
            expect(wrapper.find('[data-qa="prime-button"]').text()).toBe("Verify");
        });

        scopedIt("renders the password form when nothing is pending", () => {
            const wrapper = mount(ViewReauthenticate);

            expect(passwordForm(wrapper).exists()).toBe(true);
            expect(twoFactorForm(wrapper).exists()).toBe(false);
        });

        scopedIt("switches to the two-factor form when the flow arrives after mount", async () => {
            const wrapper = mount(ViewReauthenticate);
            expect(passwordForm(wrapper).exists()).toBe(true);

            userStore.authPendingFlow = "mfa_reauthenticate";
            await flushPromises();

            expect(twoFactorForm(wrapper).exists()).toBe(true);
            expect(passwordForm(wrapper).exists()).toBe(false);
        });

        scopedIt("keeps the two-factor form after completing the flow clears it", async () => {
            userStore.authPendingFlow = "mfa_reauthenticate";
            const wrapper = mount(ViewReauthenticate);

            userStore.authPendingFlow = null;
            await flushPromises();

            expect(twoFactorForm(wrapper).exists()).toBe(true);
        });

        scopedIt("ignores a sign-in flow", async () => {
            userStore.authPendingFlow = "reauthenticate";
            const wrapper = mount(ViewReauthenticate);

            userStore.authPendingFlow = "mfa_authenticate";
            await flushPromises();

            expect(passwordForm(wrapper).exists()).toBe(true);
        });
    });

    describe("Submitting", () => {
        scopedIt("the password form confirms the password", async () => {
            userStore.authPendingFlow = "reauthenticate";
            const wrapper = mount(ViewReauthenticate);

            await passwordForm(wrapper).props("runAction")({ formValues: { password: "hunter2" } });

            expect(userStore.reauthenticate).toHaveBeenCalledWith({ password: "hunter2" });
            expect(userStore.twoFactorReauthenticate).not.toHaveBeenCalled();
        });

        scopedIt("the two-factor form confirms the code", async () => {
            userStore.authPendingFlow = "mfa_reauthenticate";
            const wrapper = mount(ViewReauthenticate);

            await twoFactorForm(wrapper).props("runAction")({ formValues: { code: "123456" } });

            expect(userStore.twoFactorReauthenticate).toHaveBeenCalledWith({ code: "123456" });
            expect(userStore.reauthenticate).not.toHaveBeenCalled();
        });
    });

    describe("Toasts", () => {
        const reauthenticatedToasts = expect.objectContaining({
            success: expect.objectContaining({ title: "Identity Confirmed" }),
            redirectFailed: expect.objectContaining({
                title: "Identity confirmed, but could not open the next page",
            }),
        });

        scopedIt("the two-factor form announces a confirmed identity", () => {
            userStore.authPendingFlow = "mfa_reauthenticate";
            const wrapper = mount(ViewReauthenticate);

            expect(twoFactorForm(wrapper).props("toasts")).toEqual(reauthenticatedToasts);
        });

        scopedIt("the password form announces a confirmed identity", () => {
            userStore.authPendingFlow = "reauthenticate";
            const wrapper = mount(ViewReauthenticate);

            expect(passwordForm(wrapper).props("toasts")).toEqual(reauthenticatedToasts);
        });

        scopedIt("a toasts attribute replaces the default", () => {
            const toasts = { success: { title: "Verified" } };
            userStore.authPendingFlow = "mfa_reauthenticate";
            const wrapper = mount(ViewReauthenticate, { attrs: { toasts } });

            expect(twoFactorForm(wrapper).props("toasts")).toEqual(toasts);
        });
    });

    describe("Slots and attributes", () => {
        scopedIt("replaces the action bar of the password form", () => {
            userStore.authPendingFlow = "reauthenticate";
            const wrapper = mount(ViewReauthenticate, {
                slots: { "action-bar": '<button data-qa="custom-submit">Go</button>' },
            });

            expect(wrapper.find('[data-qa="custom-submit"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="prime-button"]').exists()).toBe(false);
        });

        scopedIt("forwards other slots to the two-factor form", () => {
            userStore.authPendingFlow = "mfa_reauthenticate";
            const wrapper = mount(ViewReauthenticate, {
                slots: { extra: '<span data-qa="extra-slot">extra</span>' },
            });

            expect(wrapper.find('[data-qa="extra-slot"]').exists()).toBe(true);
        });

        scopedIt("a sub-title attribute replaces the password form's default", () => {
            userStore.authPendingFlow = "reauthenticate";
            const wrapper = mount(ViewReauthenticate, { attrs: { subTitle: "Prove it" } });

            expect(passwordForm(wrapper).props("subTitle")).toBe("Prove it");
        });
    });
});
