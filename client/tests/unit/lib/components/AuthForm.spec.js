import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const mockOnSubmissionErrorHandler = vi.fn();
const mockRedirectTo = vi.fn();
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

const formContext = { state: { values: { email: "" } } };
const useAuthFlow = vi.fn(() => ({
    formContext,
    onSubmissionErrorHandler: mockOnSubmissionErrorHandler,
    redirectTo: mockRedirectTo,
}));
vi.mock("@vueda/use/useAuthFlow.js", () => ({ useAuthFlow }));

const storeState = { pendingFlow: null };
const storeUser = vi.fn(() => storeState);
vi.mock("@vueda/stores/storeUser.js", () => ({ storeUser }));

const useTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme, THEME_OVERRIDE_PROPS: {} }));

vi.mock("@vueda/components/ActionForm.vue", () => ({ default: ActionFormStub }));
vi.mock("@vueda/components/PageTitle.vue", () => ({ default: PageTitleStub }));

let AuthForm;

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
        AuthForm = (await import("@vueda/components/AuthForm.vue")).default;
        useAuthFlow.mockClear();
        useTheme.mockClear();
        storeUser.mockClear();
    });

    scopedIt("emits form-object on mount and renders ActionForm", () => {
        const wrapper = mountAuthForm();
        const emitArg = wrapper.emitted("form-object")[0][0];
        expect(emitArg.value).toBe(formContext.state.values);
        expect(wrapper.find('[data-qa="action-form"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="page-title"]').attributes("data-title")).toBe("Sign In");
    });

    scopedIt("wires onSubmissionErrorHandler and redirectTo from useAuthFlow to ActionForm", () => {
        const wrapper = mountAuthForm();
        const stub = wrapper.getComponent(ActionFormStub);
        expect(stub.props("onSubmissionErrorHandler")).toBe(mockOnSubmissionErrorHandler);
        expect(stub.props("redirectTo")).toBe(mockRedirectTo);
    });

    scopedIt("forwards slot content via form-content slot", () => {
        const wrapper = mountAuthForm({
            slots: {
                "form-content": `<div data-qa="custom-form">slot</div>`,
            },
        });
        expect(wrapper.find('[data-qa="custom-form"]').exists()).toBe(true);
    });

    scopedIt("delegates to useAuthFlow with component props", () => {
        mountAuthForm({ props: { formProps: { initialValues: { email: "" } } } });
        expect(useAuthFlow).toHaveBeenCalledWith(
            expect.objectContaining({ formProps: { initialValues: { email: "" } } }),
        );
    });
});
