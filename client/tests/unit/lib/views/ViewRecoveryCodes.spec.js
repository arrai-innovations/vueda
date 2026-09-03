import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { defineComponent, h, reactive, ref } from "vue";

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));

const useIsActiveMock = vi.fn();
const storeUserMock = vi.fn();
const useClipboardMock = vi.fn();

const AuthFormStub = defineComponent({
    name: "AuthFormStub",
    props: ["onSubmissionSuccessHandler", "runAction"],
    setup(props, { slots }) {
        return () =>
            h("div", { "data-qa": "auth-form" }, [
                slots["action-form-inner"] ? slots["action-form-inner"]({}) : null,
                slots["action-bar"] ? slots["action-bar"]({ loading: false, handleCancelClick: vi.fn() }) : null,
            ]);
    },
});

const ButtonStub = defineComponent({
    name: "ButtonStub",
    emits: ["click"],
    setup(_, { emit, slots }) {
        return () => {
            const children = slots.default?.();
            return h(
                "button",
                {
                    "data-qa": "prime-button",
                    onClick: () => emit("click"),
                },
                children,
            );
        };
    },
});
const FeedbackSpinnerStub = defineComponent({
    name: "FeedbackSpinnerStub",
    setup() {
        return () => h("div", { "data-qa": "feedback-spinner" });
    },
});

const FeedbackAlertStub = defineComponent({
    name: "FeedbackAlertStub",
    props: ["variant"],
    setup(props, { slots }) {
        return () =>
            h(
                "div",
                { "data-qa": "feedback-alert", "data-variant": props.variant },
                slots.default ? slots.default() : null,
            );
    },
});
const FeedbackAlertDescriptionStub = defineComponent({
    name: "FeedbackAlertDescriptionStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "feedback-alert-description" }, slots.default ? slots.default() : null);
    },
});
const FeedbackAlertTitleStub = defineComponent({
    name: "FeedbackAlertTitleStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "feedback-alert-title" }, slots.default ? slots.default() : null);
    },
});

const ClickToCopyTextStub = defineComponent({
    name: "ClickToCopyTextStub",
    props: ["text"],
    setup(props) {
        return () => h("div", { "data-qa": "click-to-copy", "data-text": props.text });
    },
});

vi.mock("@vueda/views/AuthForm.vue", () => ({ default: AuthFormStub }));
vi.mock("@vueda/display/click-to-copy-text/ClickToCopyText.vue", () => ({ default: ClickToCopyTextStub }));
vi.mock("@vueda/use/useIsActive.js", () => ({ useIsActive: () => useIsActiveMock() }));
vi.mock("@vueda/stores/storeUser.js", () => ({ storeUser: () => storeUserMock() }));
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: makeUseThemeMock({ slotResolver: (part) => part }),
    THEME_OVERRIDE_PROPS: {},
}));
vi.mock("@vueda/use/useIcons.js", () => ({ ICON_OVERRIDE_PROPS: {}, useIcons: () => () => null }));
vi.mock("@vueuse/core", () => ({ useClipboard: () => useClipboardMock() }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/display/loading/LoadingSpinnerInline.vue", () => ({ default: FeedbackSpinnerStub }));
vi.mock("@vueda/feedback/alert/Alert.vue", () => ({ default: FeedbackAlertStub }));
vi.mock("@vueda/feedback/alert/AlertDescription.vue", () => ({ default: FeedbackAlertDescriptionStub }));
vi.mock("@vueda/feedback/alert/AlertTitle.vue", () => ({ default: FeedbackAlertTitleStub }));

const toastMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    message: vi.fn(),
};
vi.mock("@arrai-innovations/vue-sonner", () => ({ toast: toastMock }));

const routerPush = vi.fn();
const routerHasRoute = vi.fn(() => true);
vi.mock("vue-router", () => ({ useRouter: () => ({ push: routerPush, hasRoute: routerHasRoute }) }));

let ViewRecoveryCodes;
let activeRef;
let userStore;
let clipboardState;

/**
 * Find the first stubbed Button whose visible text contains the given label.
 *
 * @param {import('@vue/test-utils').VueWrapper} wrapper
 * @param {string} label
 * @returns {import('@vue/test-utils').DOMWrapper}
 */
const findButtonByLabel = (wrapper, label) =>
    wrapper.findAll('[data-qa="prime-button"]').find((btn) => btn.text().includes(label));

describe("lib/views/ViewRecoveryCodes.vue", () => {
    beforeEach(async () => {
        storeUserMock.mockReset();
        useIsActiveMock.mockReset();
        useClipboardMock.mockReset();
        activeRef = ref(false);
        useIsActiveMock.mockReturnValue(activeRef);
        clipboardState = { copied: ref(false), copy: vi.fn() };
        useClipboardMock.mockReturnValue(clipboardState);
        userStore = reactive({
            loggedInUser: reactive({ totp_devices: [] }),
            getRecoveryCodes: vi.fn().mockResolvedValue({ data: { unused_codes: ["one", "two"] } }),
            generateRecoveryCode: vi.fn(),
        });
        storeUserMock.mockReturnValue(userStore);
        Object.values(toastMock).forEach((fn) => fn.mockClear());
        routerPush.mockClear();
        routerHasRoute.mockClear();
        routerHasRoute.mockReturnValue(true);
        clipboardState.copy.mockClear();
        ViewRecoveryCodes = (await import("@vueda/views/ViewRecoveryCodes.vue")).default;
    });

    afterEach(() => {
        vi.resetModules();
    });

    describe("Code loading and display", () => {
        scopedIt("fetches recovery codes when active with totp devices", async () => {
            const wrapper = mount(ViewRecoveryCodes);
            userStore.loggedInUser.totp_devices = [{ id: 1 }];
            activeRef.value = true;
            await flushPromises();
            expect(userStore.getRecoveryCodes).toHaveBeenCalled();
            const items = wrapper.findAll('[data-qa="view-recovery-codes-form-list-item"]');
            expect(items).toHaveLength(2);
            expect(items[0].text()).toContain("one");
            expect(items[1].text()).toContain("two");
        });

        scopedIt("renders deterministic numeric prefix on each list item", async () => {
            const wrapper = mount(ViewRecoveryCodes);
            userStore.loggedInUser.totp_devices = [{ id: 1 }];
            activeRef.value = true;
            await flushPromises();
            const items = wrapper.findAll('[data-qa="view-recovery-codes-form-list-item"]');
            expect(items[0].text()).toContain("1.");
            expect(items[1].text()).toContain("2.");
        });
    });

    describe("Missing device state", () => {
        scopedIt("renders warning empty branch with set-up CTA when no totp devices", () => {
            const wrapper = mount(ViewRecoveryCodes);
            const alert = wrapper.find('[data-qa="feedback-alert"]');
            expect(alert.attributes("data-variant")).toBe("warning");
            expect(wrapper.find('[data-qa="feedback-alert-title"]').text()).toContain("Set up two-factor first");
            expect(findButtonByLabel(wrapper, "Set up a device")).toBeTruthy();
            expect(userStore.getRecoveryCodes).not.toHaveBeenCalled();
        });

        scopedIt("set-up button routes to setup-device when registered", async () => {
            const wrapper = mount(ViewRecoveryCodes);
            await findButtonByLabel(wrapper, "Set up a device").trigger("click");
            expect(routerHasRoute).toHaveBeenCalledWith("setup-device");
            expect(routerPush).toHaveBeenCalledWith({ name: "setup-device" });
        });

        scopedIt("set-up button no-ops when setup-device route is not registered", async () => {
            routerHasRoute.mockReturnValue(false);
            const wrapper = mount(ViewRecoveryCodes);
            await findButtonByLabel(wrapper, "Set up a device").trigger("click");
            expect(routerPush).not.toHaveBeenCalled();
        });
    });

    describe("Populated code actions", () => {
        scopedIt("populated alert renders title with one-line description", async () => {
            const wrapper = mount(ViewRecoveryCodes);
            userStore.loggedInUser.totp_devices = [{ id: 1 }];
            activeRef.value = true;
            await flushPromises();
            const title = wrapper.find('[data-qa="feedback-alert-title"]');
            expect(title.exists()).toBe(true);
            expect(title.text()).toContain("Each code works once");
        });

        scopedIt("handleSuccess updates codes and shows toast", async () => {
            const wrapper = mount(ViewRecoveryCodes);
            userStore.loggedInUser.totp_devices = [{ id: 1 }];
            const handler = wrapper.findComponent(AuthFormStub).props("onSubmissionSuccessHandler");
            await handler({ data: { unused_codes: ["new1"] } });
            await flushPromises();
            expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining("generated"));
            const items = wrapper.findAll('[data-qa="view-recovery-codes-form-list-item"]');
            expect(items).toHaveLength(1);
            expect(items[0].text()).toContain("new1");
        });

        scopedIt("download, print, and copy actions operate on codes", async () => {
            const wrapper = mount(ViewRecoveryCodes);
            userStore.loggedInUser.totp_devices = [{ id: 1 }];
            activeRef.value = true;
            await flushPromises();

            const clickMock = vi.fn();
            const originalCreate = document.createElement;
            const originalAppend = document.body.appendChild;
            const anchorRemove = vi.fn();
            const anchor = { click: clickMock, remove: anchorRemove, href: "", download: "" };
            document.createElement = vi.fn(() => anchor);
            const appendSpy = vi.fn();
            document.body.appendChild = appendSpy;
            const revokeMock = vi.fn();
            const originalCreateObjectURL = URL.createObjectURL;
            const originalRevokeObjectURL = URL.revokeObjectURL;
            URL.createObjectURL = vi.fn(() => "blob:url");
            URL.revokeObjectURL = revokeMock;
            const printMock = vi.fn();
            const originalPrint = window.print;
            window.print = printMock;

            await findButtonByLabel(wrapper, "Download").trigger("click");
            await findButtonByLabel(wrapper, "Print").trigger("click");
            await findButtonByLabel(wrapper, "Copy All").trigger("click");

            expect(document.createElement).toHaveBeenCalledWith("a");
            expect(appendSpy).toHaveBeenCalledWith(anchor);
            expect(clickMock).toHaveBeenCalled();
            expect(anchorRemove).toHaveBeenCalled();
            expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:url");
            expect(printMock).toHaveBeenCalled();
            expect(clipboardState.copy).toHaveBeenCalledWith("one\ntwo");

            document.createElement = originalCreate;
            document.body.appendChild = originalAppend;
            URL.createObjectURL = originalCreateObjectURL;
            URL.revokeObjectURL = originalRevokeObjectURL;
            window.print = originalPrint;
        });
    });
});
