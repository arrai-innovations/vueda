import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";

const AuthFormStub = defineComponent({
    name: "AuthFormStub",
    emits: ["form-object"],
    props: ["runAction", "onSubmissionSuccessHandler", "formProps"],
    setup(props, { slots, emit }) {
        emit("form-object", {});
        return () =>
            h("div", { "data-qa": "auth-form" }, [
                slots["action-form-inner"] ? slots["action-form-inner"]({}) : null,
                slots["confirm-button"] ? slots["confirm-button"]({ loading: false }) : null,
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

const ShellDialogStub = defineComponent({
    name: "ShellDialogStub",
    props: ["open"],
    setup(props, { slots }) {
        return () => (props.open ? h("div", { "data-qa": "dialog" }, slots.default ? slots.default() : null) : null);
    },
});

const ShellDialogContentStub = defineComponent({
    name: "ShellDialogContentStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "dialog-content" }, slots.default ? slots.default() : null);
    },
});

const ShellDialogHeaderStub = defineComponent({
    name: "ShellDialogHeaderStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "dialog-header" }, slots.default ? slots.default() : null);
    },
});

const ShellDialogTitleStub = defineComponent({
    name: "ShellDialogTitleStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "dialog-title" }, slots.default ? slots.default() : null);
    },
});

const ClickToCopyTextStub = defineComponent({
    name: "ClickToCopyTextStub",
    props: ["text"],
    setup(props) {
        return () => h("div", { "data-qa": "click-to-copy", "data-text": props.text });
    },
});

const useModelConfigMock = vi.fn();
const storeUserMock = vi.fn();

vi.mock("@vueda/components/AuthForm.vue", () => ({ default: AuthFormStub }));
vi.mock("@vueda/components/ClickToCopyText.vue", () => ({ default: ClickToCopyTextStub }));
vi.mock("@vueda/fields/FormField.vue", () => ({ default: FormFieldStub }));
vi.mock("@vueda/widgets/WidgetSelectDropdown.vue", () => ({ default: WidgetSelectDropdownStub }));
vi.mock("@vueda/widgets/WidgetTextInput.vue", () => ({ default: WidgetTextInputStub }));
vi.mock("@vueda/controls/button", () => ({ ControlButton: ButtonStub }));
vi.mock("@vueda/feedback/spinner", () => ({ FeedbackSpinner: FeedbackSpinnerStub }));
vi.mock("@vueda/shell/dialog", () => ({
    ShellDialog: ShellDialogStub,
    ShellDialogContent: ShellDialogContentStub,
    ShellDialogHeader: ShellDialogHeaderStub,
    ShellDialogTitle: ShellDialogTitleStub,
}));
vi.mock("vue-sonner", () => ({ toast: toastMock }));
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig: () => useModelConfigMock() }));
vi.mock("@vueda/stores/storeUser.js", () => ({ storeUser: () => storeUserMock() }));
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: () => (part) => part, THEME_OVERRIDE_PROPS: {} }));

const toastMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    message: vi.fn(),
};
const routerPush = vi.fn();
const routeMock = reactive({ query: {} });

vi.mock("vue-router", () => ({
    useRouter: () => ({ push: routerPush }),
    useRoute: () => routeMock,
}));

let ViewSetupDevice;
let modelConfig;
let userStore;

describe("lib/views/ViewSetupDevice.vue", () => {
    beforeEach(async () => {
        Object.values(toastMock).forEach((fn) => fn.mockClear());
        routerPush.mockClear();
        useModelConfigMock.mockReset();
        storeUserMock.mockReset();
        modelConfig = reactive({
            config: { fieldDetails: { methods: { choices: [{ label: "App", value: "app" }] } } },
        });
        useModelConfigMock.mockReturnValue(modelConfig);
        userStore = reactive({
            setupTOTPDevice: vi.fn().mockResolvedValue({}),
            activateTOTPDevice: vi.fn().mockResolvedValue({}),
        });
        storeUserMock.mockReturnValue(userStore);
        routeMock.query = {};
        ViewSetupDevice = (await import("@vueda/views/ViewSetupDevice.vue")).default;
    });

    scopedIt("runs setup action on first step", async () => {
        const wrapper = mount(ViewSetupDevice, { props: { app: "app", model: "model" } });
        wrapper.vm.form.values = { method: "sms", destination: "123" };
        const runAction = wrapper.findComponent(AuthFormStub).props("runAction");
        await runAction({ formValues: { method: "sms", destination: "123" } });
        expect(userStore.setupTOTPDevice).toHaveBeenCalledWith({ destination: "123", method: "sms" });
    });

    scopedIt("runs activation on verify step", async () => {
        const wrapper = mount(ViewSetupDevice, { props: { app: "app", model: "model" } });
        wrapper.vm.step = wrapper.vm.STEPS.VERIFY;
        const runAction = wrapper.findComponent(AuthFormStub).props("runAction");
        await runAction({ formValues: { code: "654321" } });
        expect(userStore.activateTOTPDevice).toHaveBeenCalledWith({ code: "654321" });
    });

    scopedIt("doAfterSuccess stores secrets and advances step", async () => {
        const wrapper = mount(ViewSetupDevice, { props: { app: "app", model: "model" } });
        wrapper.vm.form.values = { method: "app" };
        const handler = wrapper.findComponent(AuthFormStub).props("onSubmissionSuccessHandler");
        await handler({ meta: { totp_svg_data_uri: "data:image", totp_secret: "secret" } });
        expect(wrapper.vm.step).toBe(wrapper.vm.STEPS.VERIFY);
        expect(wrapper.vm.totpSvgDataUri).toBe("data:image");
        expect(wrapper.vm.totpSecret).toBe("secret");
    });

    scopedIt("doAfterSuccess enqueues toast for email method", async () => {
        const wrapper = mount(ViewSetupDevice, { props: { app: "app", model: "model" } });
        wrapper.vm.form.values = { method: "email" };
        const handler = wrapper.findComponent(AuthFormStub).props("onSubmissionSuccessHandler");
        await handler();
        expect(toastMock.success).toHaveBeenCalledWith(
            expect.stringContaining("Verification Code Sent"),
            expect.any(Object),
        );
        expect(wrapper.vm.step).toBe(wrapper.vm.STEPS.VERIFY);
    });

    scopedIt("navigates to return path after verification", async () => {
        routeMock.query = { returnPath: "/dashboard" };
        const wrapper = mount(ViewSetupDevice, { props: { app: "app", model: "model" } });
        wrapper.vm.step = wrapper.vm.STEPS.VERIFY;
        const handler = wrapper.findComponent(AuthFormStub).props("onSubmissionSuccessHandler");
        await handler();
        expect(wrapper.vm.step).toBe(wrapper.vm.STEPS.DONE);
        expect(routerPush).toHaveBeenCalledWith("/dashboard");
    });
});
