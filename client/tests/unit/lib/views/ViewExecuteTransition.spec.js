import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

var provideStore, mockedProvide, mockedInject;

const mockedUseLookupContext = vi.fn();
vi.mock("@vueda/use/useLookupContext.js", () => ({
    useLookupContext: mockedUseLookupContext,
}));

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({
    slotResolver: (key) => (key === "root" ? "theme-root" : ""),
});
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
}));

vi.mock("@vueda/utils/case.js", () => ({
    memoizedStartCase: (v) => v.toUpperCase(),
}));

const routerBack = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: () => ({ back: routerBack }),
}));

const executeTransition = vi.fn();
const workflowStore = { executeTransition };
vi.mock("@vueda/stores/storeWorkflow.js", () => ({
    storeWorkflow: () => workflowStore,
}));

let workflowTransitions;
vi.mock("@vueda/use/useWorkflowTransitions.js", () => ({
    useWorkflowTransitions: () => workflowTransitions,
}));

const ModelActionFormStub = defineComponent({
    name: "ModelActionFormStub",
    props: ["app", "model", "action", "actionVerboseName", "runAction", "pk"],
    setup(props, { attrs, slots }) {
        return () =>
            h(
                "div",
                {
                    "data-qa": "model-action-form",
                    "data-app": props.app,
                    "data-model": props.model,
                    "data-action": props.action,
                    "data-action-verbose-name": props.actionVerboseName,
                    ...attrs,
                },
                Object.keys(slots).map((name) => h("div", { "data-slot": name }, slots[name] ? slots[name]() : null)),
            );
    },
});
vi.mock("@vueda/views/ModelActionForm.vue", () => ({
    default: ModelActionFormStub,
}));

const ButtonStub = defineComponent({
    name: "ButtonStub",
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
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));

const PageActionsStub = defineComponent({
    name: "PageActionsStub",
    setup(_, { slots, attrs }) {
        return () => h("div", { "data-qa": "page-actions", ...attrs }, slots.default ? slots.default() : null);
    },
});
vi.mock("@vueda/shell/page-title/PageActions.vue", () => ({
    default: PageActionsStub,
}));

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    ({ provideStore, mockedProvide, mockedInject } = mockProvideInject(vi));
    return {
        __esModule: true,
        ...actual,
        inject: mockedInject,
        provide: mockedProvide,
    };
});

let ViewExecuteTransition, vue;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    workflowTransitions = vue.reactive({ transitions: [] });
    ViewExecuteTransition = (await import("@vueda/views/ViewExecuteTransition.vue")).default;
    mockedUseLookupContext.mockClear();
    mockedUseTheme.mockClear();
    routerBack.mockClear();
    executeTransition.mockClear();
    provideStore.clear();
});

describe("lib/views/ViewExecuteTransition.vue", () => {
    describe("Lookup context", () => {
        scopedIt("calls useLookupContext if lookup context is missing", () => {
            mockedInject.mockReturnValueOnce(null);
            mount(ViewExecuteTransition, { props: { app: "app", model: "model", action: "approve" } });
            expect(mockedUseLookupContext).toHaveBeenCalled();
        });

        scopedIt("does not call useLookupContext when lookup context exists", () => {
            mockedInject.mockReturnValueOnce({});
            mount(ViewExecuteTransition, { props: { app: "app", model: "model", action: "approve" } });
            expect(mockedUseLookupContext).not.toHaveBeenCalled();
        });
    });

    describe("Rendering and slot forwarding", () => {
        scopedIt("passes the route's transition code verbatim, plus app/model/pk, to ModelActionForm", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "myApp", model: "invoice", action: "Send_ForReview", pk: "id123" },
            });
            const af = wrapper.find('[data-qa="model-action-form"]');
            expect(af.attributes("data-app")).toBe("myApp");
            expect(af.attributes("data-model")).toBe("invoice");
            expect(af.attributes("data-action")).toBe("Send_ForReview");
            expect(wrapper.findComponent(ModelActionFormStub).props("pk")).toBe("id123");
        });

        scopedIt("forwards attrs (other than class) and slots to ModelActionForm", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "person", action: "approve", class: "custom" },
                attrs: { foo: "bar" },
                slots: {
                    "warning-entry": '<span data-qa="custom-warning-entry">entry</span>',
                },
            });
            const af = wrapper.find('[data-qa="model-action-form"]');
            expect(af.attributes("foo")).toBe("bar");
            expect(af.find('[data-slot="warning-entry"] [data-qa="custom-warning-entry"]').exists()).toBe(true);
        });

        scopedIt("applies theme root and registers the theme entry", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "person", action: "approve", class: "custom" },
            });
            const root = wrapper.find('[data-qa="view-execute-transition-root"]');
            expect(root.classes()).toContain("theme-root");
            expect(root.classes()).toContain("custom");
            expect(mockedUseTheme).toHaveBeenCalledWith("ViewExecuteTransition", expect.any(Object));
        });
    });

    describe("Transition display name", () => {
        scopedIt("resolves action-verbose-name from the matching transition's display name", () => {
            mockedInject.mockReturnValueOnce({});
            workflowTransitions.transitions = [
                { code: "approve", name: "Approve invoice" },
                { code: "reject", name: "Reject invoice" },
            ];
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "invoice", action: "approve" },
            });
            expect(wrapper.find('[data-qa="model-action-form"]').attributes("data-action-verbose-name")).toBe(
                "Approve invoice",
            );
        });

        scopedIt("falls back to a start-cased transition code when no transition matches yet", () => {
            mockedInject.mockReturnValueOnce({});
            workflowTransitions.transitions = [{ code: "reject", name: "Reject invoice" }];
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "invoice", action: "approve" },
            });
            expect(wrapper.find('[data-qa="model-action-form"]').attributes("data-action-verbose-name")).toBe(
                "APPROVE",
            );
        });
    });

    describe("Submission", () => {
        scopedIt("run-action submits app, model, pk, and the transition code verbatim through storeWorkflow", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "invoice", action: "approve", pk: "7" },
            });
            const runAction = wrapper.findComponent(ModelActionFormStub).props("runAction");
            runAction({ dryRun: true, acknowledgeWarnings: "digest-1" });
            expect(executeTransition).toHaveBeenCalledWith(
                "app",
                "invoice",
                "7",
                "approve",
                expect.any(Object),
                undefined,
                true,
                "digest-1",
            );
        });

        scopedIt("run-action defaults dryRun to false and forwards undefined acknowledgeWarnings when omitted", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "invoice", action: "approve", pk: "7" },
            });
            const runAction = wrapper.findComponent(ModelActionFormStub).props("runAction");
            runAction();
            expect(executeTransition).toHaveBeenCalledWith(
                "app",
                "invoice",
                "7",
                "approve",
                expect.any(Object),
                undefined,
                false,
                undefined,
            );
        });

        scopedIt("run-action forwards a bulk pk array unchanged for bulk transitions", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "invoice", action: "approve", pk: ["1", "2"] },
            });
            const runAction = wrapper.findComponent(ModelActionFormStub).props("runAction");
            runAction();
            expect(executeTransition).toHaveBeenCalledWith(
                "app",
                "invoice",
                ["1", "2"],
                "approve",
                expect.any(Object),
                undefined,
                false,
                undefined,
            );
        });
    });

    describe("Navigation", () => {
        scopedIt("forwards return-button slot and falls back to Go Back button that calls router.back", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "model", action: "approve" },
            });
            await wrapper.find('[data-qa="prime-button"]').trigger("click");
            expect(routerBack).toHaveBeenCalled();
        });

        scopedIt("custom return-button slot replaces fallback Go Back button", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "model", action: "approve" },
                slots: {
                    "return-button": "<button data-qa='custom-return'>back</button>",
                },
            });
            expect(wrapper.find('[data-qa="custom-return"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="prime-button"]').exists()).toBe(false);
        });
    });
});
