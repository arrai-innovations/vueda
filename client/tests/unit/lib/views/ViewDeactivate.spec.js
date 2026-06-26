import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";

// --- stubs ---------------------------------------------------------------

const SystemMessageCardStub = defineComponent({
    name: "SystemMessageCardStub",
    inheritAttrs: false,
    props: ["tone"],
    setup(props, { slots }) {
        return () =>
            h("div", { "data-qa": "system-message-card", "data-tone": props.tone }, [
                slots["crest-eyebrow"] ? h("div", { "data-slot": "crest-eyebrow" }, slots["crest-eyebrow"]()) : null,
                slots["crest-kind"] ? h("div", { "data-slot": "crest-kind" }, slots["crest-kind"]()) : null,
                ...(slots.default ? slots.default() : []),
                slots.actions ? h("div", { "data-slot": "actions" }, slots.actions()) : null,
            ]);
    },
});
vi.mock("@vueda/components/SystemMessageCard.vue", () => ({ default: SystemMessageCardStub }));

const ConsequencesBulletsStub = defineComponent({
    name: "ConsequencesBulletsStub",
    inheritAttrs: false,
    props: ["items"],
    setup(props) {
        return () => h("ul", { "data-qa": "consequences-bullets", "data-item-count": props.items?.length });
    },
});
vi.mock("@vueda/components/ConsequencesBullets.vue", () => ({ default: ConsequencesBulletsStub }));

const TypedConfirmFieldStub = defineComponent({
    name: "TypedConfirmFieldStub",
    inheritAttrs: false,
    props: ["expectedValue"],
    emits: ["match"],
    setup(props, { emit }) {
        return () =>
            h("div", {
                "data-qa": "typed-confirm-field",
                "data-expected": props.expectedValue,
                "onTrigger-match": (v) => emit("match", v),
            });
    },
});
vi.mock("@vueda/components/TypedConfirmField.vue", () => ({ default: TypedConfirmFieldStub }));

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["variant", "disabled"],
    setup(props, { slots, attrs }) {
        return () =>
            h(
                "button",
                { "data-variant": props.variant, disabled: props.disabled, ...attrs },
                slots.default ? slots.default() : null,
            );
    },
});
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));

// --- composable mocks ----------------------------------------------------

const mockedUseIcons = vi.fn();
vi.mock("@vueda/use/useIcons.js", () => ({ ICON_OVERRIDE_PROPS: {}, useIcons: mockedUseIcons }));

const mockedUseRouter = vi.fn();
vi.mock("vue-router", () => ({ useRouter: mockedUseRouter }));

const mockedGetDetailUrl = vi.fn();
vi.mock("@vueda/utils/urls.js", () => ({ getDetailUrl: mockedGetDetailUrl }));

vi.mock("@vueda/utils/csrf.js", () => ({ getCSRFValue: () => "csrf-token" }));

// --- store mock -----------------------------------------------------------

let userStoreState;

vi.mock("@vueda/stores/storeUser.js", () => ({
    storeUser: () => userStoreState,
}));

// --- state ---------------------------------------------------------------

let ViewDeactivate, mockFetch, mockRouter;

beforeEach(async () => {
    userStoreState = reactive({
        loggedIn: true,
        loggedInUser: { email: "mara.tani@example.com" },
        initialized: true,
    });

    mockRouter = { back: vi.fn() };
    mockedUseRouter.mockReturnValue(mockRouter);

    mockedUseIcons.mockReturnValue(() => null);

    mockedGetDetailUrl.mockReturnValue("/api/myapp/mymodel/deactivate/");

    mockFetch = vi.fn().mockResolvedValue({ status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    ViewDeactivate = (await import("@vueda/views/ViewDeactivate.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
});

describe("lib/views/ViewDeactivate.vue", () => {
    describe("card chrome", () => {
        scopedIt("renders a warning-toned SystemMessageCard", () => {
            const wrapper = mount(ViewDeactivate, { props: { app: "myapp", model: "mymodel", pk: "1" } });
            expect(wrapper.find('[data-qa="system-message-card"]').attributes("data-tone")).toBe("warning");
        });

        scopedIt("crest-eyebrow contains the model name", () => {
            const wrapper = mount(ViewDeactivate, { props: { app: "myapp", model: "account", pk: "1" } });
            expect(wrapper.find('[data-slot="crest-eyebrow"]').text()).toContain("account");
        });

        scopedIt("crest-kind contains app, model, and 'deactivate'", () => {
            const wrapper = mount(ViewDeactivate, { props: { app: "myapp", model: "account", pk: "1" } });
            expect(wrapper.find('[data-slot="crest-kind"]').text()).toBe("myapp/account/deactivate");
        });
    });

    describe("default message slot", () => {
        scopedIt("renders the default suspension explanation", () => {
            const wrapper = mount(ViewDeactivate, { props: { app: "a", model: "m", pk: "1" } });
            expect(wrapper.find('[data-qa="view-deactivate-message"]').exists()).toBe(true);
        });

        scopedIt("accepts a custom message via the message slot", () => {
            const wrapper = mount(ViewDeactivate, {
                props: { app: "a", model: "m", pk: "1" },
                slots: { message: '<span data-qa="custom-msg">Custom warning</span>' },
            });
            expect(wrapper.find('[data-qa="custom-msg"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="view-deactivate-message"]').exists()).toBe(false);
        });
    });

    describe("consequences", () => {
        scopedIt("omits ConsequencesBullets when consequences prop is empty", () => {
            const wrapper = mount(ViewDeactivate, { props: { app: "a", model: "m", pk: "1" } });
            expect(wrapper.find('[data-qa="consequences-bullets"]').exists()).toBe(false);
        });

        scopedIt("renders ConsequencesBullets when consequences has items", () => {
            const wrapper = mount(ViewDeactivate, {
                props: {
                    app: "a",
                    model: "m",
                    pk: "1",
                    consequences: [{ label: "Sessions revoked" }, { label: "Tokens disabled" }],
                },
            });
            const bullets = wrapper.find('[data-qa="consequences-bullets"]');
            expect(bullets.exists()).toBe(true);
            expect(bullets.attributes("data-item-count")).toBe("2");
        });
    });

    describe("TypedConfirmField", () => {
        scopedIt("renders the confirm field with the user email as expected value", () => {
            const wrapper = mount(ViewDeactivate, { props: { app: "a", model: "m", pk: "1" } });
            const field = wrapper.find('[data-qa="typed-confirm-field"]');
            expect(field.exists()).toBe(true);
            expect(field.attributes("data-expected")).toBe("mara.tani@example.com");
        });

        scopedIt("omits the confirm field when the user email is not available", () => {
            userStoreState.loggedInUser = {};
            const wrapper = mount(ViewDeactivate, { props: { app: "a", model: "m", pk: "1" } });
            expect(wrapper.find('[data-qa="typed-confirm-field"]').exists()).toBe(false);
        });
    });

    describe("action buttons", () => {
        scopedIt("renders a cancel button and a destructive submit button", () => {
            const wrapper = mount(ViewDeactivate, { props: { app: "a", model: "m", pk: "1" } });
            expect(wrapper.find('[data-qa="view-deactivate-cancel"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="view-deactivate-submit"]').exists()).toBe(true);
        });

        scopedIt("submit button is disabled when the confirm field has not matched", () => {
            const wrapper = mount(ViewDeactivate, { props: { app: "a", model: "m", pk: "1" } });
            expect(wrapper.find('[data-qa="view-deactivate-submit"]').attributes("disabled")).toBeDefined();
        });

        scopedIt("cancel calls router.back()", async () => {
            const wrapper = mount(ViewDeactivate, { props: { app: "a", model: "m", pk: "1" } });
            await wrapper.find('[data-qa="view-deactivate-cancel"]').trigger("click");
            expect(mockRouter.back).toHaveBeenCalled();
        });
    });

    describe("deactivate submit", () => {
        scopedIt("POSTes a PATCH to the detail URL with the correct PKs", async () => {
            const wrapper = mount(ViewDeactivate, { props: { app: "myapp", model: "mymodel", pk: "42" } });
            wrapper.vm.confirmMatch = true;
            await wrapper.vm.handleDeactivate();
            expect(mockedGetDetailUrl).toHaveBeenCalledWith("myapp", "mymodel", "deactivate");
            expect(mockFetch).toHaveBeenCalledWith(
                "/api/myapp/mymodel/deactivate/",
                expect.objectContaining({
                    method: "PATCH",
                    body: JSON.stringify({ pks: ["42"] }),
                }),
            );
        });

        scopedIt("wraps an array pk as-is in the request body", async () => {
            const wrapper = mount(ViewDeactivate, {
                props: { app: "a", model: "m", pk: ["1", "2"] },
            });
            wrapper.vm.confirmMatch = true;
            await wrapper.vm.handleDeactivate();
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(body.pks).toEqual(["1", "2"]);
        });

        scopedIt("emits 'success' after a 200 response", async () => {
            const wrapper = mount(ViewDeactivate, { props: { app: "a", model: "m", pk: "1" } });
            wrapper.vm.confirmMatch = true;
            await wrapper.vm.handleDeactivate();
            expect(wrapper.emitted("success")).toBeTruthy();
        });

        scopedIt("sets submitError when the response is not 200", async () => {
            mockFetch.mockResolvedValue({
                status: 400,
                text: async () => "Bad request",
            });
            vi.mock("@vueda/utils/fetchSupport.js", () => ({ getJsonOrText: async (r) => await r.text() }));
            const wrapper = mount(ViewDeactivate, { props: { app: "a", model: "m", pk: "1" } });
            wrapper.vm.confirmMatch = true;
            await wrapper.vm.handleDeactivate();
            expect(wrapper.find('[data-qa="view-deactivate-error"]').exists()).toBe(true);
        });

        scopedIt("does not submit when confirmMatch is false", async () => {
            const wrapper = mount(ViewDeactivate, { props: { app: "a", model: "m", pk: "1" } });
            await wrapper.vm.handleDeactivate();
            expect(mockFetch).not.toHaveBeenCalled();
        });

        scopedIt("does not submit when already submitting", async () => {
            const wrapper = mount(ViewDeactivate, { props: { app: "a", model: "m", pk: "1" } });
            wrapper.vm.confirmMatch = true;
            wrapper.vm.isSubmitting = true;
            await wrapper.vm.handleDeactivate();
            expect(mockFetch).not.toHaveBeenCalled();
        });
    });
});
