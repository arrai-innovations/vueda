import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { defineComponent, h, reactive, ref } from "vue";

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));

const formValues = reactive({});
const updateFormValue = vi.fn((name, value) => {
    formValues[name] = value;
});
const formContext = {
    state: { values: formValues },
    updateValue: updateFormValue,
};

const AuthorizingFormStub = defineComponent({
    name: "AuthorizingFormStub",
    emits: ["form-object", "form-context"],
    props: ["runAction", "formProps"],
    setup(props, { slots, emit }) {
        emit("form-object", ref(formValues));
        emit("form-context", formContext);
        return () =>
            h("div", { "data-qa": "authorizing-form" }, [
                slots["action-form-inner"] ? slots["action-form-inner"]({}) : null,
                slots["action-bar"]
                    ? slots["action-bar"]({
                          loading: false,
                          method: undefined,
                          code: undefined,
                          handleSendCode: vi.fn(),
                          cooldownSeconds: ref(60),
                          cooldown: false,
                      })
                    : null,
            ]);
    },
});

const FormFieldStub = defineComponent({
    name: "FormFieldStub",
    props: ["label", "name", "validation", "hidden"],
    setup(props, { slots }) {
        return () =>
            h("div", { "data-qa": "form-field", "data-name": props.name }, slots.default ? slots.default() : null);
    },
});

const WidgetSelectDropdownStub = defineComponent({
    name: "WidgetSelectDropdownStub",
    props: ["options"],
    setup(props, { slots }) {
        return () =>
            h(
                "select",
                { "data-qa": "widget-select-dropdown", "data-options": JSON.stringify(props.options || []) },
                slots.default ? slots.default() : null,
            );
    },
});

const WidgetTextInputStub = defineComponent({
    name: "WidgetTextInputStub",
    setup(props, { slots }) {
        return () => h("input", { "data-qa": "widget-text-input" }, slots.default ? slots.default() : null);
    },
});

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["loading"],
    emits: ["click"],
    setup(_, { emit, slots }) {
        return () =>
            h(
                "button",
                {
                    "data-qa": "prime-button",
                    onClick: () => emit("click"),
                },
                slots.default?.(),
            );
    },
});
const FeedbackSpinnerStub = defineComponent({
    name: "FeedbackSpinnerStub",
    setup() {
        return () => h("div", { "data-qa": "feedback-spinner" });
    },
});

const useIsActiveMock = vi.fn();
const storeUserMock = vi.fn();
let UnauthorizedErrorClass;
const toastMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    message: vi.fn(),
};
const routerPush = vi.fn();

const WidgetOTPInputStub = defineComponent({
    name: "WidgetOTPInputStub",
    props: ["maxlength"],
    setup() {
        return () => h("div", { "data-qa": "widget-otp-input" });
    },
});

vi.mock("@vueda/views/AuthorizingForm.vue", () => ({ default: AuthorizingFormStub }));
vi.mock("@vueda/form/form-model/FormField.vue", () => ({ default: FormFieldStub }));
vi.mock("@vueda/widgets/WidgetSelectDropdown.vue", () => ({ default: WidgetSelectDropdownStub }));
vi.mock("@vueda/widgets/WidgetTextInput.vue", () => ({ default: WidgetTextInputStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/widgets/WidgetOTPInput.vue", () => ({ default: WidgetOTPInputStub }));
vi.mock("@vueda/display/loading/LoadingSpinnerInline.vue", () => ({ default: FeedbackSpinnerStub }));
vi.mock("@vueda/use/useIcons.js", () => ({ ICON_OVERRIDE_PROPS: {}, useIcons: () => () => null }));
vi.mock("@vueda/use/useIsActive.js", () => ({ useIsActive: () => useIsActiveMock() }));
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: makeUseThemeMock({ slotResolver: (part) => part }),
    THEME_OVERRIDE_PROPS: {},
}));
vi.mock("@arrai-innovations/vue-sonner", () => ({ toast: toastMock }));
vi.mock("@vueda/stores/storeUser.js", async () => {
    const actual = await vi.importActual("@vueda/stores/storeUser.js");
    UnauthorizedErrorClass = actual.UnauthorizedError;
    return {
        ...actual,
        storeUser: () => storeUserMock(),
    };
});

vi.mock("vue-router", () => ({
    useRouter: () => ({ push: routerPush }),
}));

let ViewTwoFactorAuth;
let activeRef;
let userStore;

describe("lib/views/ViewTwoFactorAuth.vue", () => {
    beforeEach(async () => {
        Object.values(toastMock).forEach((fn) => fn.mockClear());
        routerPush.mockClear();
        useIsActiveMock.mockReset();
        storeUserMock.mockReset();
        updateFormValue.mockClear();
        formValues.method = undefined;
        activeRef = ref(false);
        useIsActiveMock.mockReturnValue(activeRef);
        userStore = reactive({
            loggedIn: false,
            getTwoFactorAuthMethod: vi.fn().mockResolvedValue({ methods: [] }),
            sendTwoFactorAuthenticationCode: vi.fn().mockResolvedValue({}),
            twoFactorAuthenticate: vi.fn().mockResolvedValue({}),
        });
        storeUserMock.mockReturnValue(userStore);
        ViewTwoFactorAuth = (await import("@vueda/views/ViewTwoFactorAuth.vue")).default;
    });

    describe("Method discovery and selection", () => {
        scopedIt("fetches 2fa methods when activated", async () => {
            userStore.getTwoFactorAuthMethod.mockResolvedValue({ methods: ["sms"] });
            const wrapper = mount(ViewTwoFactorAuth);
            activeRef.value = true;
            await flushPromises();
            expect(userStore.getTwoFactorAuthMethod).toHaveBeenCalled();
            expect(wrapper.vm.methods).toEqual(["sms"]);
            expect(wrapper.vm.computedOptions).toEqual([{ label: "SMS", value: "sms" }]);
        });

        scopedIt("toggleRecovery flips the recovery flag and clears method", async () => {
            const wrapper = mount(ViewTwoFactorAuth);
            formValues.method = "sms";
            wrapper.vm.toggleRecovery();
            expect(wrapper.vm.useRecoveryCode).toBe(true);
            expect(wrapper.vm.form.values.method).toBe("recovery");
            expect(updateFormValue).toHaveBeenLastCalledWith("method", "recovery");
            wrapper.vm.toggleRecovery();
            expect(wrapper.vm.useRecoveryCode).toBe(false);
            expect(wrapper.vm.form.values.method).toBeUndefined();
            expect(updateFormValue).toHaveBeenLastCalledWith("method", undefined);
        });

        scopedIt("redirects when methods fetch returns unauthorized", async () => {
            userStore.getTwoFactorAuthMethod.mockRejectedValue(new UnauthorizedErrorClass("Unauthorized"));
            const wrapper = mount(ViewTwoFactorAuth);
            activeRef.value = true;
            await flushPromises();
            expect(toastMock.warning).toHaveBeenCalled();
            expect(routerPush).toHaveBeenCalledWith({ name: "sign-in" });
            expect(wrapper.vm.methods).toEqual([]);
        });

        scopedIt("shows toast on generic fetch error", async () => {
            userStore.getTwoFactorAuthMethod.mockRejectedValue(new Error("boom"));
            mount(ViewTwoFactorAuth);
            activeRef.value = true;
            await flushPromises();
            expect(toastMock.error).toHaveBeenCalledWith("Error fetching 2FA methods for the user", expect.any(Object));
        });
    });

    describe("Code delivery", () => {
        scopedIt("handleSendCode triggers cooldown and toast", async () => {
            const wrapper = mount(ViewTwoFactorAuth);
            wrapper.vm.form.values = { method: "sms" };
            vi.useFakeTimers();
            await wrapper.vm.handleSendCode();
            expect(userStore.sendTwoFactorAuthenticationCode).toHaveBeenCalledWith({ method: "sms" });
            expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining("SMS"), expect.any(Object));
            expect(wrapper.vm.timer).not.toBeNull();
            expect(wrapper.vm.cooldownSeconds).toBe(60);
            vi.advanceTimersByTime(1000);
            expect(wrapper.vm.cooldownSeconds).toBe(59);
            vi.clearAllTimers();
            vi.useRealTimers();
        });

        scopedIt("handleSendCode reports errors", async () => {
            const wrapper = mount(ViewTwoFactorAuth);
            wrapper.vm.form.values = { method: "email" };
            userStore.sendTwoFactorAuthenticationCode.mockRejectedValue(new Error("fail"));
            await wrapper.vm.handleSendCode();
            expect(toastMock.error).toHaveBeenCalledWith("Failed to send 2FA code", expect.any(Object));
            expect(wrapper.vm.timer).toBeNull();
        });
    });

    describe("Authentication submission", () => {
        scopedIt("handleSubmit delegates to store", async () => {
            const wrapper = mount(ViewTwoFactorAuth);
            await wrapper.vm.handleSubmit({ formValues: { code: "000000" } });
            expect(userStore.twoFactorAuthenticate).toHaveBeenCalledWith({ code: "000000" });
        });
    });

    describe("Activation guards", () => {
        scopedIt("does not fetch methods when inactive", async () => {
            mount(ViewTwoFactorAuth);
            activeRef.value = false;
            userStore.loggedIn = false;
            userStore.getTwoFactorAuthMethod.mockClear();
            await flushPromises();
            expect(userStore.getTwoFactorAuthMethod).not.toHaveBeenCalled();
        });

        scopedIt("does not fetch methods when not logged in", async () => {
            mount(ViewTwoFactorAuth);
            userStore.loggedIn = true;
            activeRef.value = true;
            userStore.getTwoFactorAuthMethod.mockClear();
            await flushPromises();
            expect(userStore.getTwoFactorAuthMethod).not.toHaveBeenCalled();
        });
    });

    describe("Cooldown behavior", () => {
        scopedIt("handleSendCode sends email and resets cooldown", async () => {
            const wrapper = mount(ViewTwoFactorAuth);
            wrapper.vm.form.values = { method: "email" };
            wrapper.vm.cooldownSeconds = 12;
            vi.useFakeTimers();
            await wrapper.vm.handleSendCode();
            expect(userStore.sendTwoFactorAuthenticationCode).toHaveBeenCalledWith({ method: "email" });
            expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining("email"), expect.any(Object));
            expect(wrapper.vm.cooldownSeconds).toBe(60);
            expect(wrapper.vm.timer).not.toBeNull();
            vi.clearAllTimers();
            vi.useRealTimers();
        });

        scopedIt("successfully called sendTwoFactorAuthenticationCode for recovery method", async () => {
            const wrapper = mount(ViewTwoFactorAuth);
            wrapper.vm.form.values = { method: "recovery" };
            vi.useFakeTimers();
            await wrapper.vm.handleSendCode();
            expect(userStore.sendTwoFactorAuthenticationCode).toHaveBeenCalledWith({ method: "recovery" });
            expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining("recovery"), expect.any(Object));
            vi.clearAllTimers();
            vi.useRealTimers();
        });

        scopedIt("ignores handleSendCode while cooldown active", async () => {
            const wrapper = mount(ViewTwoFactorAuth);
            wrapper.vm.form.values = { method: "sms" };
            vi.useFakeTimers();
            await wrapper.vm.handleSendCode();
            await wrapper.vm.handleSendCode();
            expect(userStore.sendTwoFactorAuthenticationCode).toHaveBeenCalledTimes(1);
            expect(wrapper.vm.cooldownSeconds).toBe(60);
            expect(vi.getTimerCount()).toBe(1);
            vi.clearAllTimers();
            vi.useRealTimers();
        });

        scopedIt("clears cooldown timer on unmount", async () => {
            const wrapper = mount(ViewTwoFactorAuth);
            wrapper.vm.form.values = { method: "sms" };
            vi.useFakeTimers();
            await wrapper.vm.handleSendCode();
            expect(vi.getTimerCount()).toBe(1);
            wrapper.unmount();
            expect(vi.getTimerCount()).toBe(0);
            vi.useRealTimers();
        });
    });
});
