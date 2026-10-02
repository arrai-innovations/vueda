import {
    AuthorizingFormStub,
    FormFieldStub,
    PassthroughStub,
    RouterLinkStub,
    lastAuthorizingFormProps,
} from "./passwordResetStubs.js";
import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

const forgotPasswordMock = vi.fn();
const toastSuccess = vi.fn();

vi.mock("@vueda/views/AuthorizingForm.vue", () => ({ default: AuthorizingFormStub }));
vi.mock("@vueda/form/form-model/FormField.vue", () => ({ default: FormFieldStub }));
vi.mock("@vueda/widgets/WidgetTextInput.vue", () => ({ default: PassthroughStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: PassthroughStub }));
vi.mock("@vueda/display/loading/LoadingSpinnerInline.vue", () => ({ default: PassthroughStub }));
vi.mock("@arrai-innovations/vue-sonner", () => ({ toast: { success: toastSuccess } }));
vi.mock("@vueda/stores/storeUser.js", () => ({ storeUser: () => ({ forgotPassword: forgotPasswordMock }) }));

let ViewForgotPassword;

const mountView = (options = {}) =>
    mount(ViewForgotPassword, { global: { stubs: { RouterLink: RouterLinkStub } }, ...options });

describe("lib/views/ViewForgotPassword.vue", () => {
    beforeEach(async () => {
        forgotPasswordMock.mockReset();
        toastSuccess.mockReset();
        ViewForgotPassword = (await import("@vueda/views/ViewForgotPassword.vue")).default;
    });

    scopedIt("requests a reset link for the entered email", async () => {
        mountView();

        await lastAuthorizingFormProps.value.runAction({ formValues: { email: "reset@domain.invalid" } });

        expect(forgotPasswordMock).toHaveBeenCalledWith({ email: "reset@domain.invalid" });
    });

    scopedIt("confirms without saying whether an account uses the address", () => {
        mountView();

        lastAuthorizingFormProps.value.onSubmissionSuccessHandler();

        expect(toastSuccess).toHaveBeenCalledWith("Check Your Email", {
            description: "If an account uses that address, it will receive a link to reset its password.",
            duration: 10000,
        });
    });

    scopedIt("links back to sign in, at the route signInTo names", () => {
        const wrapper = mountView({ props: { signInTo: { name: "login" } } });

        const link = wrapper.find("a");
        expect(link.text()).toBe("Back to sign in");
        expect(JSON.parse(link.attributes("data-to"))).toEqual({ name: "login" });
    });
});
