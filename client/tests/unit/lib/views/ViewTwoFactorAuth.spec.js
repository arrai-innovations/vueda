import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { defineComponent, h, reactive, ref } from "vue";

const AuthorizingFormStub = defineComponent({
    name: "AuthorizingFormStub",
    emits: ["form-object"],
    props: ["runAction", "formProps"],
    setup(props, { slots, emit }) {
        emit("form-object", {});
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

const makeFieldStub = (qa) =>
    defineComponent({
        name: `${qa}Stub`,
        props: ["label", "name"],
        setup(props, { slots }) {
            return () => h("div", { "data-qa": qa, "data-name": props.name }, slots.default ? slots.default() : null);
        },
    });

const FieldStringStub = makeFieldStub("field-string");

const WidgetSelectStub = defineComponent({
    name: "WidgetSelectStub",
    props: ["options"],
    setup(props, { slots }) {
        return () =>
            h(
                "select",
                { "data-qa": "widget-select", "data-options": JSON.stringify(props.options || []) },
                slots.default ? slots.default() : null,
            );
    },
});

const WidgetInputStub = defineComponent({
    name: "WidgetInputStub",
    setup(props, { slots }) {
        return () => h("input", { "data-qa": "widget-input" }, slots.default ? slots.default() : null);
    },
});

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["label", "loading"],
    emits: ["click"],
    setup(props, { emit, slots }) {
        return () =>
            h(
                "button",
                {
                    "data-qa": "prime-button",
                    "data-label": props.label,
                    onClick: () => emit("click"),
                },
                slots.default ? slots.default() : props.label,
            );
    },
});

const useIsActiveMock = vi.fn();
const storeUserMock = vi.fn();
let UnauthorizedErrorClass;
const toastAdd = vi.fn();
const routerPush = vi.fn();

vi.mock("@vueda/components/AuthorizingForm.vue", () => ({ default: AuthorizingFormStub }));
vi.mock("@vueda/fields/FieldString.vue", () => ({ default: FieldStringStub }));
vi.mock("@vueda/widgets/WidgetSelect.vue", () => ({ default: WidgetSelectStub }));
vi.mock("@vueda/widgets/WidgetInput.vue", () => ({ default: WidgetInputStub }));
vi.mock("@vueda/widgets/WidgetLabel.vue", () => ({ getWidgetSlotsComputed: () => [] }));
vi.mock("primevue/button", () => ({ default: ButtonStub }));
vi.mock("@vueda/use/useIsActive.js", () => ({ useIsActive: () => useIsActiveMock() }));
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: () => (part) => part, THEME_OVERRIDE_PROPS: {} }));
vi.mock("primevue/usetoast", () => ({ useToast: () => ({ add: toastAdd }) }));
vi.mock("@vueda/utils/html.js", () => ({ escapeHtml: (v) => v }));
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
        toastAdd.mockClear();
        routerPush.mockClear();
        useIsActiveMock.mockReset();
        storeUserMock.mockReset();
        activeRef = ref(false);
        useIsActiveMock.mockReturnValue(activeRef);
        userStore = reactive({
            loggedIn: false,
            getTwoFactorAuthMethod: vi.fn().mockResolvedValue({ method: [] }),
            sendTwoFactorAuthenticationCode: vi.fn().mockResolvedValue({}),
            twoFactorAuthenticate: vi.fn().mockResolvedValue({}),
        });
        storeUserMock.mockReturnValue(userStore);
        ViewTwoFactorAuth = (await import("@vueda/views/ViewTwoFactorAuth.vue")).default;
    });

    scopedIt("fetches 2fa methods when activated", async () => {
        userStore.getTwoFactorAuthMethod.mockResolvedValue({ method: ["sms"] });
        const wrapper = mount(ViewTwoFactorAuth);
        activeRef.value = true;
        await flushPromises();
        expect(userStore.getTwoFactorAuthMethod).toHaveBeenCalled();
        expect(wrapper.vm.methods).toEqual(["sms"]);
        expect(wrapper.vm.computedOptions).toEqual([
            { label: "SMS", value: "sms" },
            { label: "2FA Recovery Code", value: "recovery" },
        ]);
    });

    scopedIt("redirects when methods fetch returns unauthorized", async () => {
        userStore.getTwoFactorAuthMethod.mockRejectedValue(new UnauthorizedErrorClass("Unauthorized"));
        const wrapper = mount(ViewTwoFactorAuth);
        activeRef.value = true;
        await flushPromises();
        expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ severity: "warn" }));
        expect(routerPush).toHaveBeenCalledWith({ name: "sign-in" });
        expect(wrapper.vm.methods).toEqual([]);
    });

    scopedIt("shows toast on generic fetch error", async () => {
        userStore.getTwoFactorAuthMethod.mockRejectedValue(new Error("boom"));
        mount(ViewTwoFactorAuth);
        activeRef.value = true;
        await flushPromises();
        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({ severity: "error", summary: "Error fetching 2FA methods for the user" }),
        );
    });

    scopedIt("handleSendCode triggers cooldown and toast", async () => {
        const wrapper = mount(ViewTwoFactorAuth);
        wrapper.vm.form.values = { method: "sms" };
        vi.useFakeTimers();
        await wrapper.vm.handleSendCode();
        expect(userStore.sendTwoFactorAuthenticationCode).toHaveBeenCalledWith({ method: "sms" });
        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({ severity: "success", summary: expect.stringContaining("SMS") }),
        );
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
        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({ severity: "error", summary: "Failed to send 2FA code" }),
        );
        expect(wrapper.vm.timer).toBeNull();
    });

    scopedIt("handleSubmit delegates to store", async () => {
        const wrapper = mount(ViewTwoFactorAuth);
        await wrapper.vm.handleSubmit({ code: "000000" });
        expect(userStore.twoFactorAuthenticate).toHaveBeenCalledWith({ code: "000000" });
    });

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

    scopedIt("handleSendCode sends email and resets cooldown", async () => {
        const wrapper = mount(ViewTwoFactorAuth);
        wrapper.vm.form.values = { method: "email" };
        wrapper.vm.cooldownSeconds = 12;
        vi.useFakeTimers();
        await wrapper.vm.handleSendCode();
        expect(userStore.sendTwoFactorAuthenticationCode).toHaveBeenCalledWith({ method: "email" });
        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({ severity: "success", summary: expect.stringContaining("email") }),
        );
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
        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({ severity: "success", summary: expect.stringContaining("recovery") }),
        );
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
