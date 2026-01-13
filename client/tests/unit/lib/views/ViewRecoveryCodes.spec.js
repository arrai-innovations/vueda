import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { defineComponent, h, reactive, ref } from "vue";

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
    props: ["label", "copied"],
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

const MessageStub = defineComponent({
    name: "MessageStub",
    props: ["severity"],
    setup(props, { slots }) {
        return () =>
            h(
                "div",
                { "data-qa": "prime-message", "data-severity": props.severity },
                slots.default ? slots.default() : null,
            );
    },
});

const ClickToCopyTextStub = defineComponent({
    name: "ClickToCopyTextStub",
    props: ["text"],
    setup(props) {
        return () => h("div", { "data-qa": "click-to-copy", "data-text": props.text });
    },
});

vi.mock("@vueda/components/AuthForm.vue", () => ({ default: AuthFormStub }));
vi.mock("@vueda/components/ClickToCopyText.vue", () => ({ default: ClickToCopyTextStub }));
vi.mock("@vueda/use/useIsActive.js", () => ({ useIsActive: () => useIsActiveMock() }));
vi.mock("@vueda/stores/storeUser.js", () => ({ storeUser: () => storeUserMock() }));
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: () => (part) => part }));
vi.mock("@vueuse/core", () => ({ useClipboard: () => useClipboardMock() }));
vi.mock("primevue/button", () => ({ default: ButtonStub }));
vi.mock("primevue/message", () => ({ default: MessageStub }));

const toastAdd = vi.fn();
vi.mock("primevue/usetoast", () => ({ useToast: () => ({ add: toastAdd }) }));

const routerPush = vi.fn();
vi.mock("vue-router", () => ({ useRouter: () => ({ push: routerPush }) }));

let ViewRecoveryCodes;
let activeRef;
let userStore;
let clipboardState;

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
        toastAdd.mockClear();
        routerPush.mockClear();
        clipboardState.copy.mockClear();
        ViewRecoveryCodes = (await import("@vueda/views/ViewRecoveryCodes.vue")).default;
    });

    afterEach(() => {
        vi.resetModules();
    });

    scopedIt("fetches recovery codes when active with totp devices", async () => {
        const wrapper = mount(ViewRecoveryCodes);
        userStore.loggedInUser.totp_devices = [{ id: 1 }];
        activeRef.value = true;
        await flushPromises();
        expect(userStore.getRecoveryCodes).toHaveBeenCalled();
        const items = wrapper.findAll('[data-qa="view-recovery-codes-form-list-item"]');
        expect(items).toHaveLength(2);
        expect(items[0].text().trim()).toBe("one");
    });

    scopedIt("shows error message when no totp devices", () => {
        const wrapper = mount(ViewRecoveryCodes);
        expect(wrapper.find('[data-qa="prime-message"]').attributes("data-severity")).toBe("error");
        expect(userStore.getRecoveryCodes).not.toHaveBeenCalled();
    });

    scopedIt("handleSuccess updates codes and shows toast", async () => {
        const wrapper = mount(ViewRecoveryCodes);
        userStore.loggedInUser.totp_devices = [{ id: 1 }];
        const handler = wrapper.findComponent(AuthFormStub).props("onSubmissionSuccessHandler");
        await handler({ data: { unused_codes: ["new1"] } });
        await flushPromises();
        expect(toastAdd).toHaveBeenCalledWith(
            expect.objectContaining({ severity: "success", summary: expect.stringContaining("generated") }),
        );
        const items = wrapper.findAll('[data-qa="view-recovery-codes-form-list-item"]');
        expect(items).toHaveLength(1);
        expect(items[0].text().trim()).toBe("new1");
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

        await wrapper.find('[data-label="Download"]').trigger("click");
        await wrapper.find('[data-label="Print"]').trigger("click");
        await wrapper.find('[data-label="Copy All"]').trigger("click");

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
