import { scopedIt } from "@tests/unit/utils.js";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { defineComponent, h, reactive } from "vue";

enableAutoUnmount(afterEach);

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
    props: ["app", "model", "action", "pk"],
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
const ModelActionStub = defineComponent({
    name: "ModelActionStub",
    setup() {
        return () => h("div", { "data-qa": "model-action" });
    },
});
const ActionOnlyStub = defineComponent({
    name: "ActionOnlyStub",
    setup() {
        return () => h("div", { "data-qa": "action-only" });
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
vi.mock("@/views/ViewActionABPublish.vue", () => ({ default: ModelActionStub }));
vi.mock("@/views/ViewActionABArchive.vue", () => {
    throw new Error("no override");
});
vi.mock("@/views/ViewActionArchive.vue", () => ({ default: ActionOnlyStub }));
vi.mock("@/views/ViewActionABList.vue", () => ({ default: ModelActionStub }));

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
    crudComponents.list.mockReset().mockResolvedValue(CrudStub);
    modelConfig.loading = false;
    modelConfig.info = { actions: [] };
    workflow.transitions = [];
    workflow.loading = false;
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

    describe("Navigation while resolving", () => {
        scopedIt("keeps the current instance and target until the destination is ready", async () => {
            modelConfig.info = { actions: [{ name: "list" }] };
            const wrapper = mount(ViewActionRouter, { props: { app: "a", model: "first", action: "list" } });
            await flushPromises();
            const instance = wrapper.getComponent(CrudStub).vm;
            modelConfig.loading = true;
            await wrapper.setProps({ model: "second", pk: "42" });
            await flushPromises();
            expect(wrapper.find('[data-qa="loading"]').exists()).toBe(false);
            expect(wrapper.getComponent(CrudStub).vm).toBe(instance);
            expect(wrapper.getComponent(CrudStub).props()).toMatchObject({ model: "first", pk: "" });

            let resolveComponent;
            crudComponents.list.mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        resolveComponent = resolve;
                    }),
            );
            modelConfig.loading = false;
            await flushPromises();
            expect(wrapper.getComponent(CrudStub).props("model")).toBe("first");
            resolveComponent(CrudStub);
            await flushPromises();
            expect(wrapper.getComponent(CrudStub).vm).toBe(instance);
            expect(wrapper.getComponent(CrudStub).props()).toMatchObject({ model: "second", pk: "42" });
        });

        scopedIt("keeps array primary keys unchanged while metadata is loading", async () => {
            const pks = reactive(["1"]);
            modelConfig.info = { actions: [{ name: "list" }] };
            const wrapper = mount(ViewActionRouter, { props: { app: "a", model: "b", action: "list", pk: pks } });
            await flushPromises();
            modelConfig.loading = true;
            pks.push("2");
            await flushPromises();
            expect(wrapper.getComponent(CrudStub).props("pk")).toEqual(["1"]);
            modelConfig.loading = false;
            await flushPromises();
            expect(wrapper.getComponent(CrudStub).props("pk")).toEqual(["1", "2"]);
        });

        scopedIt("ignores an obsolete import when navigation changes again", async () => {
            modelConfig.info = { actions: [{ name: "list" }] };
            const wrapper = mount(ViewActionRouter, { props: { app: "a", model: "first", action: "list" } });
            await flushPromises();
            let resolveOld;
            crudComponents.list.mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        resolveOld = resolve;
                    }),
            );
            await wrapper.setProps({ model: "second" });
            await flushPromises();
            await wrapper.setProps({ model: "third" });
            await flushPromises();
            expect(wrapper.getComponent(CrudStub).props("model")).toBe("third");
            resolveOld(OverrideCodeStub);
            await flushPromises();
            expect(wrapper.findComponent(OverrideCodeStub).exists()).toBe(false);
            expect(wrapper.getComponent(CrudStub).props("model")).toBe("third");
        });

        scopedIt("waits for workflow metadata before choosing a colliding CRUD action", async () => {
            modelConfig.info = { actions: [{ name: "activate" }] };
            workflow.loading = true;
            const wrapper = mount(ViewActionRouter, { props: { app: "a", model: "b", action: "activate" } });
            await flushPromises();
            expect(wrapper.find('[data-qa="loading"]').exists()).toBe(true);
            expect(crudComponents.activate).not.toHaveBeenCalled();
            workflow.transitions = [{ code: "activate", name: "Activate" }];
            workflow.loading = false;
            await vi.waitFor(() => expect(wrapper.findComponent(ExecuteTransitionStub).exists()).toBe(true));
            expect(crudComponents.activate).not.toHaveBeenCalled();
        });
    });

    describe("Action resolution", () => {
        scopedIt("uses a model-specific view for an ordinary action", async () => {
            modelConfig.info = { actions: [{ name: "publish" }] };
            const wrapper = mount(ViewActionRouter, { props: { app: "a", model: "b", action: "publish" } });
            await vi.waitFor(() => expect(wrapper.findComponent(ModelActionStub).exists()).toBe(true));
        });

        scopedIt("uses an action-only view when the model-specific view is absent", async () => {
            modelConfig.info = { actions: [{ name: "archive" }] };
            const wrapper = mount(ViewActionRouter, { props: { app: "a", model: "b", action: "archive" } });
            await vi.waitFor(() => expect(wrapper.findComponent(ActionOnlyStub).exists()).toBe(true));
        });

        scopedIt("falls back to ViewAction when no convention-named view exists", async () => {
            modelConfig.info = { actions: [{ name: "approve" }] };
            const wrapper = mount(ViewActionRouter, { props: { app: "a", model: "b", action: "approve" } });
            await vi.waitFor(() => expect(wrapper.findComponent(ActionStub).exists()).toBe(true));
        });

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
            expect(wrapper.findComponent(ModelActionStub).exists()).toBe(false);
        });
    });
});
