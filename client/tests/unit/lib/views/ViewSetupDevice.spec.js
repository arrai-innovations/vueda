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

const makeFieldStub = (qa) =>
    defineComponent({
        name: `${qa}Stub`,
        props: ["label", "name"],
        setup(props, { slots }) {
            return () => h("div", { "data-qa": qa, "data-name": props.name }, slots.default ? slots.default() : null);
        },
    });

const FieldStringStub = makeFieldStub("field-string");
const FieldEmailStub = makeFieldStub("field-email");

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

const DialogStub = defineComponent({
    name: "DialogStub",
    props: ["visible"],
    setup(props, { slots }) {
        return () => (props.visible ? h("div", { "data-qa": "dialog" }, slots.default ? slots.default() : null) : null);
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
vi.mock("@vueda/fields/FieldString.vue", () => ({ default: FieldStringStub }));
vi.mock("@vueda/fields/FieldEmail.vue", () => ({ default: FieldEmailStub }));
vi.mock("@vueda/widgets/WidgetSelect.vue", () => ({ default: WidgetSelectStub }));
vi.mock("@vueda/widgets/WidgetInput.vue", () => ({ default: WidgetInputStub }));
vi.mock("@vueda/widgets/WidgetLabel.vue", () => ({ getWidgetSlotsComputed: () => [] }));
vi.mock("primevue/button", () => ({ default: ButtonStub }));
vi.mock("primevue/dialog", () => ({ default: DialogStub }));
vi.mock("primevue/usetoast", () => ({ useToast: () => ({ add: toastAdd }) }));
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig: () => useModelConfigMock() }));
vi.mock("@vueda/stores/storeUser.js", () => ({ storeUser: () => storeUserMock() }));
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: () => (part) => part, THEME_OVERRIDE_PROPS: {} }));

const toastAdd = vi.fn();
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
        toastAdd.mockClear();
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
        await runAction({ method: "sms", destination: "123" });
        expect(userStore.setupTOTPDevice).toHaveBeenCalledWith({ destination: "123", method: "sms" });
    });

    scopedIt("runs activation on verify step", async () => {
        const wrapper = mount(ViewSetupDevice, { props: { app: "app", model: "model" } });
        wrapper.vm.step = wrapper.vm.STEPS.VERIFY;
        const runAction = wrapper.findComponent(AuthFormStub).props("runAction");
        await runAction({ code: "654321" });
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
        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: "success",
                summary: expect.stringContaining("Verification Code Sent"),
            }),
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
