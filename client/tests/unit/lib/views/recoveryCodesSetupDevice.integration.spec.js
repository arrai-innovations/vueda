import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, reactive, ref } from "vue";
import { RouterView, createMemoryHistory, createRouter } from "vue-router";

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));

// Each submit runs the view's action and then its success handler, as AuthForm does.
const AuthFormStub = defineComponent({
    name: "AuthFormStub",
    props: ["runAction", "onSubmissionSuccessHandler", "formProps"],
    emits: ["form-object"],
    setup(props, { slots, emit }) {
        const formValues = { method: "app", code: "123456" };
        emit("form-object", formValues);
        const submit = async () => {
            const response = await props.runAction({ formValues });
            await props.onSubmissionSuccessHandler(response);
        };
        return () =>
            h("div", { "data-qa": "auth-form" }, [
                slots["action-form-inner"]?.({}),
                slots["action-bar"]?.({ loading: false, handleCancelClick: vi.fn() }),
                slots["confirm-button"]?.({ loading: false }),
                h("button", { "data-qa": "auth-form-submit", onClick: submit }),
            ]);
    },
});

const ButtonStub = defineComponent({
    name: "ButtonStub",
    emits: ["click"],
    setup(_, { emit, slots }) {
        return () => h("button", { "data-qa": "prime-button", onClick: () => emit("click") }, slots.default?.());
    },
});

const EmptyStub = defineComponent({ setup: () => () => h("div") });
const SlotStub = defineComponent({
    setup:
        (_, { slots }) =>
        () =>
            h("div", slots.default?.()),
});

const storeUserMock = vi.fn();

vi.mock("@vueda/views/AuthForm.vue", () => ({ default: AuthFormStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/display/loading/LoadingSpinnerInline.vue", () => ({ default: EmptyStub }));
vi.mock("@vueda/feedback/alert/Alert.vue", () => ({ default: SlotStub }));
vi.mock("@vueda/feedback/alert/AlertDescription.vue", () => ({ default: SlotStub }));
vi.mock("@vueda/feedback/alert/AlertTitle.vue", () => ({ default: SlotStub }));
vi.mock("@vueda/form/form-model/FormField.vue", () => ({ default: SlotStub }));
vi.mock("@vueda/widgets/WidgetSelectDropdown.vue", () => ({ default: EmptyStub }));
vi.mock("@vueda/widgets/WidgetTextInput.vue", () => ({ default: EmptyStub }));
vi.mock("@vueda/widgets/WidgetOTPInput.vue", () => ({ default: EmptyStub }));
vi.mock("@vueda/stores/storeUser.js", () => ({ storeUser: () => storeUserMock() }));
vi.mock("@vueda/use/useIsActive.js", () => ({ useIsActive: () => ref(true) }));
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig: () => reactive({ config: null }) }));
vi.mock("@vueda/use/useIcons.js", () => ({ ICON_OVERRIDE_PROPS: {}, useIcons: () => () => null }));
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: makeUseThemeMock({ slotResolver: (part) => part }),
    THEME_OVERRIDE_PROPS: {},
}));
vi.mock("@vueuse/core", () => ({ useClipboard: () => ({ copied: ref(false), copy: vi.fn() }) }));
vi.mock("@arrai-innovations/vue-sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

describe("lib/views/{ViewRecoveryCodes,ViewSetupDevice}.vue", () => {
    describe("Device setup from recovery codes", () => {
        scopedIt("returns to the recovery codes page after the new device is activated", async () => {
            storeUserMock.mockReturnValue(
                reactive({
                    loggedInUser: { totp_devices: [] },
                    getRecoveryCodes: vi.fn().mockResolvedValue({ data: { unused_codes: [] } }),
                    generateRecoveryCode: vi.fn(),
                    setupTOTPDevice: vi.fn().mockResolvedValue({ meta: {} }),
                    activateTOTPDevice: vi.fn().mockResolvedValue({}),
                }),
            );
            const ViewRecoveryCodes = (await import("@vueda/views/ViewRecoveryCodes.vue")).default;
            const ViewSetupDevice = (await import("@vueda/views/ViewSetupDevice.vue")).default;
            const router = createRouter({
                history: createMemoryHistory(),
                routes: [
                    {
                        path: "/recovery-codes/",
                        name: "recovery-codes",
                        component: ViewRecoveryCodes,
                    },
                    {
                        path: "/setup-device/",
                        name: "setup-device",
                        component: ViewSetupDevice,
                        props: { app: "vueda_user", model: "totpdevice" },
                    },
                ],
            });
            await router.push("/recovery-codes/");
            const wrapper = mount(RouterView, { global: { plugins: [router] } });
            await flushPromises();

            const setupButton = wrapper
                .findAll('[data-qa="prime-button"]')
                .find((button) => button.text().includes("Set up a device"));
            await setupButton.trigger("click");
            await flushPromises();
            expect(router.currentRoute.value.name).toBe("setup-device");

            // The first submit chooses the device method. The second submit activates the device.
            await wrapper.find('[data-qa="auth-form-submit"]').trigger("click");
            await flushPromises();
            await wrapper.find('[data-qa="auth-form-submit"]').trigger("click");
            await flushPromises();

            expect(router.currentRoute.value.fullPath).toBe("/recovery-codes/");
        });
    });
});
