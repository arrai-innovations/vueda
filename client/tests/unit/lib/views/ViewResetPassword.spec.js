import {
    AuthorizingFormStub,
    FormFieldStub,
    PassthroughStub,
    RouterLinkStub,
    lastAuthorizingFormProps,
} from "./passwordResetStubs.js";
import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";

const checkResetLinkIsValidMock = vi.fn();
const resetPasswordMock = vi.fn();
const routerPush = vi.fn();
const toastSuccess = vi.fn();

vi.mock("@vueda/views/AuthorizingForm.vue", () => ({ default: AuthorizingFormStub }));
vi.mock("@vueda/form/form-model/FormField.vue", () => ({ default: FormFieldStub }));
vi.mock("@vueda/widgets/WidgetTextInput.vue", () => ({ default: PassthroughStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: PassthroughStub }));
vi.mock("@vueda/display/loading/LoadingSpinnerInline.vue", () => ({ default: PassthroughStub }));
vi.mock("@arrai-innovations/vue-sonner", () => ({ toast: { success: toastSuccess } }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock("@vueda/stores/storeUser.js", () => ({
    storeUser: () => ({ checkResetLinkIsValid: checkResetLinkIsValidMock, resetPassword: resetPasswordMock }),
}));

let ViewResetPassword;

const mountView = (props = {}) =>
    mount(ViewResetPassword, {
        props: { pk: "abc", token: "tok", ...props },
        global: { stubs: { RouterLink: RouterLinkStub } },
    });

describe("lib/views/ViewResetPassword.vue", () => {
    beforeEach(async () => {
        checkResetLinkIsValidMock.mockReset().mockResolvedValue({ detail: "Token is valid." });
        resetPasswordMock.mockReset();
        routerPush.mockReset();
        toastSuccess.mockReset();
        ViewResetPassword = (await import("@vueda/views/ViewResetPassword.vue")).default;
    });

    scopedIt("checks the link from its pk and token, and shows the form for a valid one", async () => {
        const wrapper = mountView();
        await flushPromises();

        expect(checkResetLinkIsValidMock).toHaveBeenCalledWith({ pk: "abc", token: "tok" });
        expect(wrapper.find('[data-field="password"]').exists()).toBe(true);
        expect(wrapper.find('[data-field="password_confirm"]').exists()).toBe(true);
    });

    scopedIt("replaces the form with a way to request a new link when the link is rejected", async () => {
        checkResetLinkIsValidMock.mockRejectedValue(new Error("invalid"));

        const wrapper = mountView({ forgotPasswordTo: { name: "forgot" } });
        await flushPromises();

        expect(wrapper.find('[data-field="password"]').exists()).toBe(false);
        const invalid = wrapper.find('[data-qa="reset-password-invalid"]');
        expect(invalid.text()).toContain("This password reset link is invalid or has already been used.");
        expect(JSON.parse(invalid.find("a").attributes("data-to"))).toEqual({ name: "forgot" });
    });

    scopedIt("resets the password with the link's pk and token", async () => {
        mountView();

        await lastAuthorizingFormProps.value.runAction({
            formValues: { password: "new-password", password_confirm: "new-password" },
        });

        expect(resetPasswordMock).toHaveBeenCalledWith({
            password: "new-password",
            password_confirm: "new-password",
            pk: "abc",
            token: "tok",
        });
    });

    scopedIt("goes to sign in after a successful reset", async () => {
        mountView({ signInTo: { name: "login" } });

        await lastAuthorizingFormProps.value.onSubmissionSuccessHandler();

        expect(toastSuccess).toHaveBeenCalledWith("Password Reset", expect.any(Object));
        expect(routerPush).toHaveBeenCalledWith({ name: "login" });
    });
});
