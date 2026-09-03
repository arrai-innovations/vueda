import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const ActionFormStub = defineComponent({
    name: "ActionFormStub",
    props: ["runAction"],
    setup(props, { slots, attrs }) {
        return () => h("div", { "data-qa": "action-form", ...attrs }, slots.default ? slots.default({}) : null);
    },
});

const formContext = { state: { values: {} } };
const useSignInFlow = vi.fn(() => ({ formContext }));
vi.mock("@vueda/use/useSignInFlow.js", () => ({ useSignInFlow }));

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const useTheme = makeUseThemeMock({ slotResolver: () => "theme" });
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme, THEME_OVERRIDE_PROPS: {} }));

vi.mock("@vueda/views/ActionForm.vue", () => ({ default: ActionFormStub }));

let AuthorizingForm;

function mountAuthorizingForm(options = {}) {
    return mount(AuthorizingForm, {
        props: {
            header: "Welcome",
            subTitle: "Sign in",
            redirect: { name: "welcome" },
            ...options.props,
        },
        slots: options.slots,
    });
}

describe("lib/views/AuthorizingForm.vue", () => {
    beforeEach(async () => {
        AuthorizingForm = (await import("@vueda/views/AuthorizingForm.vue")).default;
        useSignInFlow.mockClear();
        useTheme.mockClear();
    });

    scopedIt("renders content when permitted", () => {
        const wrapper = mountAuthorizingForm();
        expect(wrapper.find('[data-qa="authorizing-form-header"]').text()).toBe("Welcome");
        expect(wrapper.find('[data-qa="action-form"]').exists()).toBe(true);
    });

    scopedIt("renders invalid message slot when not permitted", () => {
        const wrapper = mountAuthorizingForm({
            props: { permitted: false },
            slots: { "invalid-message": '<p data-qa="invalid">no</p>' },
        });
        expect(wrapper.find('[data-qa="invalid"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="action-form"]').exists()).toBe(false);
    });

    scopedIt("emits form-object and form-context on mount", () => {
        const wrapper = mountAuthorizingForm();
        const emitArg = wrapper.emitted("form-object")[0][0];
        expect(emitArg.value).toBe(formContext.state.values);
        expect(wrapper.emitted("form-context")[0][0]).toBe(formContext);
    });

    scopedIt("delegates to useSignInFlow with component props", () => {
        mountAuthorizingForm({ props: { redirect: "/home", requireRecentLogin: true } });
        expect(useSignInFlow).toHaveBeenCalledWith(
            expect.objectContaining({ redirect: "/home", requireRecentLogin: true }),
        );
    });
});
