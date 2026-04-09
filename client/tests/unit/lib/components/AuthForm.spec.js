import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";

const ActionFormStub = defineComponent({
    name: "ActionFormStub",
    props: ["runAction", "onSubmissionErrorHandler", "redirectTo"],
    setup(props, { slots, attrs }) {
        return () => h("div", { "data-qa": "action-form", ...attrs }, slots.default ? slots.default({}) : null);
    },
});

const PageTitleStub = defineComponent({
    name: "PageTitleStub",
    props: ["title"],
    setup(props, { slots }) {
        return () =>
            h("div", { "data-qa": "page-title", "data-title": props.title }, slots.subtitle ? slots.subtitle() : null);
    },
});

const toastMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    message: vi.fn(),
};
vi.mock("vue-sonner", () => ({ toast: toastMock }));

const routerPush = vi.fn();
let routeQuery = {};
vi.mock("vue-router", () => ({
    useRouter: () => ({ push: routerPush }),
    useRoute: () => ({ fullPath: "/current", query: routeQuery }),
}));

const UnauthorizedError = class extends Error {};
const storeState = reactive({
    pendingFlow: null,
});
const storeUser = vi.fn(() => storeState);
vi.mock("@vueda/stores/storeUser.js", () => ({
    UnauthorizedError,
    storeUser,
}));

const formState = { values: { email: "" } };
const useForm = vi.fn(() => ({ state: formState }));
vi.mock("@vueda/use/useForm.js", () => ({ useForm }));

const useIsActive = vi.fn(() => ({ value: true }));
vi.mock("@vueda/use/useIsActive.js", () => ({ useIsActive }));

const defaultOnSubmissionError = vi.fn(async () => false);
vi.mock("@vueda/use/useObjectForm.js", () => ({ defaultOnSubmissionError }));

const useTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme, THEME_OVERRIDE_PROPS: {} }));

vi.mock("@vueda/components/ActionForm.vue", () => ({ default: ActionFormStub }));
vi.mock("@vueda/components/PageTitle.vue", () => ({ default: PageTitleStub }));

let AuthForm, vue;

function mountAuthForm(options = {}) {
    return mount(AuthForm, {
        props: {
            header: "Sign In",
            subTitle: "Welcome",
            runAction: options.runAction,
            ...options.props,
        },
        slots: options.slots,
    });
}

describe("lib/components/AuthForm.vue", () => {
    beforeEach(async () => {
        vue = await import("vue");
        AuthForm = (await import("@vueda/components/AuthForm.vue")).default;
        Object.values(toastMock).forEach((fn) => fn.mockClear());
        routerPush.mockClear();
        defaultOnSubmissionError.mockClear();
        useForm.mockClear();
        useTheme.mockClear();
        storeUser.mockClear();
        storeState.pendingFlow = null;
        routeQuery = {};
    });

    scopedIt("emits form-object on mount and renders ActionForm", () => {
        const wrapper = mountAuthForm();
        const emitArg = wrapper.emitted("form-object")[0][0];
        expect(emitArg.value).toBe(formState.values);
        expect(wrapper.find('[data-qa="action-form"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="page-title"]').attributes("data-title")).toBe("Sign In");
    });

    scopedIt("forwards slot content via form-content slot", () => {
        const wrapper = mountAuthForm({
            slots: {
                "form-content": `<div data-qa="custom-form">slot</div>`,
            },
        });
        expect(wrapper.find('[data-qa="custom-form"]').exists()).toBe(true);
    });

    scopedIt("redirectTo pushes returnPath on cancel", async () => {
        routeQuery = { returnPath: "/back" };
        const wrapper = mountAuthForm();
        const redirectTo = wrapper.getComponent(ActionFormStub).props("redirectTo");
        await redirectTo("cancel");
        expect(routerPush).toHaveBeenCalledWith("/back");
    });

    scopedIt("OnSubmissionErrorHandler handles UnauthorizedError", async () => {
        const wrapper = mountAuthForm();
        const handler = wrapper.getComponent(ActionFormStub).props("onSubmissionErrorHandler");
        const result = await handler({
            error: new UnauthorizedError("nope"),
            formContext: {},
            toast: toastMock,
        });
        expect(result).toBe(true);
        expect(routerPush).toHaveBeenCalledWith({ name: "reauthenticate", query: { redirect: "/current" } });
        expect(toastMock.warning).toHaveBeenCalledWith(expect.stringContaining("verify"), expect.any(Object));
    });

    scopedIt("falls back to defaultOnSubmissionError for other errors", async () => {
        const wrapper = mountAuthForm();
        const handler = wrapper.getComponent(ActionFormStub).props("onSubmissionErrorHandler");
        const error = new Error("bad");
        await handler({ error, formContext: {}, toast: toastMock });
        expect(defaultOnSubmissionError).toHaveBeenCalledWith({ error, formContext: {}, toast: toastMock });
    });

    scopedIt("watches pendingFlow for reauthentication flows", async () => {
        mountAuthForm();
        storeState.pendingFlow = { id: "mfa_reauthenticate" };
        await vue.nextTick();
        expect(routerPush).toHaveBeenCalledWith({ name: "reauthenticate", query: { redirect: "/current" } });
    });
});
