import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive, ref } from "vue";

const ActionFormStub = defineComponent({
    name: "ActionFormStub",
    props: ["runAction"],
    setup(props, { slots, attrs }) {
        return () => h("div", { "data-qa": "action-form", ...attrs }, slots.default ? slots.default({}) : null);
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
    useRoute: () => ({ query: routeQuery }),
}));

const isActiveRef = ref(false);
const useIsActive = vi.fn(() => isActiveRef);
vi.mock("@vueda/use/useIsActive.js", () => ({ useIsActive }));

const formState = { values: {} };
const useForm = vi.fn(() => ({ state: formState }));
vi.mock("@vueda/use/useForm.js", () => ({ useForm }));

const store = reactive({
    loggedIn: false,
    recentlyLoggedIn: false,
    pendingFlow: null,
});
const storeUser = vi.fn(() => store);
vi.mock("@vueda/stores/storeUser.js", () => ({ storeUser }));

const useTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme, THEME_OVERRIDE_PROPS: {} }));

vi.mock("@vueda/components/ActionForm.vue", () => ({ default: ActionFormStub }));

let AuthorizingForm, vue;

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

describe("lib/components/AuthorizingForm.vue", () => {
    beforeEach(async () => {
        vue = await import("vue");
        AuthorizingForm = (await import("@vueda/components/AuthorizingForm.vue")).default;
        Object.values(toastMock).forEach((fn) => fn.mockClear());
        routerPush.mockClear();
        useForm.mockClear();
        storeUser.mockClear();
        useTheme.mockClear();
        useIsActive.mockClear();
        Object.assign(store, { loggedIn: false, recentlyLoggedIn: false, pendingFlow: null });
        routeQuery = {};
        isActiveRef.value = false;
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

    scopedIt("emits form-object on mount", () => {
        const wrapper = mountAuthorizingForm();
        const emitArg = wrapper.emitted("form-object")[0][0];
        expect(emitArg.value).toBe(formState.values);
    });

    scopedIt("redirects to prop when login completes", async () => {
        mountAuthorizingForm();
        isActiveRef.value = true;
        store.loggedIn = true;
        store.recentlyLoggedIn = true;
        routerPush.mockClear();
        await vue.nextTick();
        await vue.nextTick();
        expect(routerPush).toHaveBeenCalledWith({ name: "welcome" });
        expect(toastMock.success).toHaveBeenCalledWith("Signed In", expect.any(Object));
    });

    scopedIt("uses route redirect when provided", async () => {
        routeQuery = { redirect: "/home" };
        mountAuthorizingForm();
        isActiveRef.value = true;
        store.loggedIn = true;
        store.recentlyLoggedIn = true;
        routerPush.mockClear();
        await vue.nextTick();
        await vue.nextTick();
        expect(routerPush).toHaveBeenCalledWith("/home");
    });

    scopedIt("respects requireRecentLogin", async () => {
        mountAuthorizingForm({ props: { requireRecentLogin: true } });
        isActiveRef.value = true;
        store.loggedIn = true;
        store.recentlyLoggedIn = false;
        await vue.nextTick();
        await vue.nextTick();
        routerPush.mockClear();
        store.recentlyLoggedIn = true;
        await vue.nextTick();
        expect(routerPush).toHaveBeenCalledWith({ name: "welcome" });
    });

    scopedIt("pushes to 2fa when pending flow requires it", async () => {
        mountAuthorizingForm();
        routerPush.mockClear();
        store.pendingFlow = { id: "mfa_authenticate" };
        await vue.nextTick();
        expect(routerPush).toHaveBeenCalledWith({ name: "2fa" });
    });
});
