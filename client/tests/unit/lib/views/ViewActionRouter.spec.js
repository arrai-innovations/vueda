import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { defineComponent, h, reactive } from "vue";

const LoadingStub = defineComponent({
    name: "LoadingStub",
    setup() {
        return () => h("div", { "data-qa": "loading" });
    },
});
const ActionStub = defineComponent({
    name: "ActionStub",
    setup() {
        return () => h("div", { "data-qa": "action" });
    },
});
const NotFoundStub = defineComponent({
    name: "NotFoundStub",
    setup() {
        return () => h("div", { "data-qa": "not-found" });
    },
});
const ExecuteTransitionStub = defineComponent({
    name: "ExecuteTransitionStub",
    setup() {
        return () => h("div", { "data-qa": "execute-transition" });
    },
});
const CrudStub = defineComponent({
    name: "CrudStub",
    setup() {
        return () => h("div", { "data-qa": "crud" });
    },
});
const OverrideAppModelStub = defineComponent({
    name: "OverrideAppModelStub",
    setup() {
        return () => h("div", { "data-qa": "override-app-model" });
    },
});
const OverrideCodeStub = defineComponent({
    name: "OverrideCodeStub",
    setup() {
        return () => h("div", { "data-qa": "override-code" });
    },
});

vi.mock("@vueda/views/ViewLoading.vue", () => ({ default: LoadingStub }));
vi.mock("@vueda/views/ViewAction.vue", () => ({ default: ActionStub }));
vi.mock("@vueda/views/ViewActionNotFound.vue", () => ({ default: NotFoundStub }));
vi.mock("@vueda/views/ViewExecuteTransition.vue", () => ({ default: ExecuteTransitionStub }));

// getExtraActionComponent's dynamic imports use the real, unmocked getPascalCaseName, so these
// paths are the actual `@/views/ViewAction{App}{Model}{Action}.vue` and `@/views/ViewAction{Action}.vue`
// specifiers ViewActionRouter builds for app "a" / model "b" and the "approve" / "activate" actions
// exercised below. `@` is not aliased in this package's own vite config (it is reserved for a
// consuming project's src), so leaving these unmocked hangs the dynamic import indefinitely instead
// of rejecting; mocking them to throw simulates "no project override exists" and lets resolution
// fall through to the terminal fallback like it would in a real consuming project.
vi.mock("@/views/ViewActionABApprove.vue", () => {
    throw new Error("no override");
});
vi.mock("@/views/ViewActionApprove.vue", () => {
    throw new Error("no override");
});
vi.mock("@/views/ViewActionABActivate.vue", () => {
    throw new Error("no override");
});
vi.mock("@/views/ViewActionActivate.vue", () => {
    throw new Error("no override");
});

// Positive-override fixtures: "reject" resolves at the app-model-code tier, and "void" has no
// app-model-code override but does resolve at the code-only tier. Both prove a project override
// still wins over the ViewExecuteTransition fallback for a transition code, not just for a
// standard CRUDL action.
vi.mock("@/views/ViewActionABReject.vue", () => ({ default: OverrideAppModelStub }));
vi.mock("@/views/ViewActionABVoid.vue", () => {
    throw new Error("no override");
});
vi.mock("@/views/ViewActionVoid.vue", () => ({ default: OverrideCodeStub }));

const modelConfig = reactive({
    loading: false,
    info: { actions: [] },
});
const workflow = reactive({
    transitions: [],
});
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: () => modelConfig,
}));
vi.mock("@vueda/use/useWorkflowTransitions.js", () => ({
    useWorkflowTransitions: () => workflow,
}));

const crudComponents = { list: vi.fn(async () => CrudStub), activate: vi.fn(async () => CrudStub) };
vi.mock("@vueda/router/routerComponent.js", () => ({
    crudComponents,
}));
vi.mock("@vueda/utils/actionMap.js", () => ({
    getActionName: (a) => a,
}));

let ViewActionRouter;

beforeEach(async () => {
    ViewActionRouter = (await import("@vueda/views/ViewActionRouter.vue")).default;
    vi.clearAllMocks();
    modelConfig.loading = false;
    modelConfig.info = { actions: [] };
    workflow.transitions = [];
});

describe("lib/views/ViewActionRouter.vue", () => {
    describe("Loading state", () => {
        scopedIt("shows loading component when model config is loading", async () => {
            modelConfig.loading = true;
            const wrapper = mount(ViewActionRouter, {
                props: { app: "app", model: "model", action: "list" },
            });
            await flushPromises();
            expect(wrapper.find('[data-qa="loading"]').exists()).toBe(true);
        });
    });

    describe("Action resolution", () => {
        scopedIt("resolves a recognized transition code to ViewExecuteTransition", async () => {
            workflow.transitions = [{ code: "approve", name: "Approve" }];
            const wrapper = mount(ViewActionRouter, {
                props: { app: "a", model: "b", action: "approve" },
            });
            await vi.waitFor(
                () => {
                    expect(wrapper.find('[data-qa="execute-transition"]').exists()).toBe(true);
                },
                { timeout: 1000, interval: 50 },
            );
        });

        scopedIt('no longer special-cases the literal action name "transition"', async () => {
            modelConfig.info = { actions: [{ name: "list" }] };
            workflow.transitions = [{ code: "approve", name: "Approve" }];
            const wrapper = mount(ViewActionRouter, {
                props: { app: "a", model: "b", action: "transition" },
            });
            await flushPromises();
            expect(wrapper.find('[data-qa="not-found"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="execute-transition"]').exists()).toBe(false);
        });

        scopedIt(
            "does not let a transition code shadowed by a crudComponents key resolve through the registry",
            async () => {
                workflow.transitions = [{ code: "activate", name: "Activate" }];
                const wrapper = mount(ViewActionRouter, {
                    props: { app: "a", model: "b", action: "activate" },
                });
                await vi.waitFor(
                    () => {
                        expect(wrapper.find('[data-qa="execute-transition"]').exists()).toBe(true);
                    },
                    { timeout: 1000, interval: 50 },
                );
                expect(crudComponents.activate).not.toHaveBeenCalled();
                expect(wrapper.find('[data-qa="crud"]').exists()).toBe(false);
            },
        );

        scopedIt(
            "resolves a project's app-model-code override ahead of ViewExecuteTransition for a transition code",
            async () => {
                workflow.transitions = [{ code: "reject", name: "Reject" }];
                const wrapper = mount(ViewActionRouter, {
                    props: { app: "a", model: "b", action: "reject" },
                });
                await vi.waitFor(
                    () => {
                        expect(wrapper.find('[data-qa="override-app-model"]').exists()).toBe(true);
                    },
                    { timeout: 1000, interval: 50 },
                );
                expect(wrapper.find('[data-qa="execute-transition"]').exists()).toBe(false);
            },
        );

        scopedIt(
            "resolves a project's code-only override ahead of ViewExecuteTransition when no app-model-code override exists",
            async () => {
                workflow.transitions = [{ code: "void", name: "Void" }];
                const wrapper = mount(ViewActionRouter, {
                    props: { app: "a", model: "b", action: "void" },
                });
                await vi.waitFor(
                    () => {
                        expect(wrapper.find('[data-qa="override-code"]').exists()).toBe(true);
                    },
                    { timeout: 1000, interval: 50 },
                );
                expect(wrapper.find('[data-qa="execute-transition"]').exists()).toBe(false);
            },
        );

        scopedIt("shows not-found when actions and transitions are missing", async () => {
            modelConfig.info = undefined;
            workflow.transitions = undefined;
            const wrapper = mount(ViewActionRouter, {
                props: { app: "a", model: "b", action: "whatever" },
            });
            await flushPromises();
            expect(wrapper.find('[data-qa="not-found"]').exists()).toBe(true);
        });

        scopedIt("loads crud component when action is known", async () => {
            modelConfig.info = { actions: [{ name: "list" }] };
            const wrapper = mount(ViewActionRouter, {
                props: { app: "a", model: "b", action: "list" },
            });
            await flushPromises();
            expect(crudComponents.list).toHaveBeenCalledWith({ app: "a", model: "b", action: "list", pk: "" });
            expect(wrapper.find('[data-qa="crud"]').exists()).toBe(true);
        });
    });
});
