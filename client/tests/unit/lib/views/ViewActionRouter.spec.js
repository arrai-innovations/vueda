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
const ProjectModelStub = defineComponent({
    name: "ProjectModelStub",
    setup() {
        return () => h("div", { "data-qa": "project-model" });
    },
});
const ProjectWideStub = defineComponent({
    name: "ProjectWideStub",
    setup() {
        return () => h("div", { "data-qa": "project-wide" });
    },
});

vi.mock("@vueda/views/ViewLoading.vue", () => ({ default: LoadingStub }));
vi.mock("@vueda/views/ViewAction.vue", () => ({ default: ActionStub }));
vi.mock("@vueda/views/ViewActionNotFound.vue", () => ({ default: NotFoundStub }));
vi.mock("@vueda/views/ViewExecuteTransition.vue", () => ({ default: ExecuteTransitionStub }));

// ViewActionRouter builds its `@/views/View{Name}.vue` imports with the real, unmocked getPascalCaseName,
// so these paths are the actual specifiers that it builds for app "a" / model "b" and the actions
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

// The project-wide fallback views exist only while a test sets them here.
const projectWideViews = vi.hoisted(() => ({ action: null, executeTransition: null }));
vi.mock("@/views/ViewAction.vue", () => ({
    get default() {
        if (!projectWideViews.action) {
            throw new Error("no override");
        }
        return projectWideViews.action;
    },
}));
vi.mock("@/views/ViewExecuteTransition.vue", () => ({
    get default() {
        if (!projectWideViews.executeTransition) {
            throw new Error("no override");
        }
        return projectWideViews.executeTransition;
    },
}));

// Built-in action fixtures for findProjectView: "read" has a model-specific view on model "b" and a
// project-wide view for every other model, and "update" has no project view.
vi.mock("@/views/ViewReadAB.vue", () => ({ default: ProjectModelStub }));
vi.mock("@/views/ViewReadAC.vue", () => {
    throw new Error("no override");
});
vi.mock("@/views/ViewRead.vue", () => ({ default: ProjectWideStub }));
vi.mock("@/views/ViewUpdateAB.vue", () => {
    throw new Error("no override");
});
vi.mock("@/views/ViewUpdate.vue", () => {
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
vi.mock("@/views/ViewListAB.vue", () => ({ default: ProjectModelStub }));

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

const findProjectViewLoader = (name) =>
    vi.fn((target, { findProjectView }) => findProjectView(name, async () => CrudStub));
const crudComponents = {
    list: vi.fn(async () => CrudStub),
    activate: vi.fn(async () => CrudStub),
    read: findProjectViewLoader("Read"),
    update: findProjectViewLoader("Update"),
};
vi.mock("@vueda/router/routerComponent.js", () => ({
    crudComponents,
}));
vi.mock("@vueda/utils/actionMap.js", () => ({
    getActionName: (a) => a,
}));

const warnUnmatchedProjectViews = vi.fn();
const reportProjectViewLoadError = vi.fn();
vi.mock("@vueda/utils/projectViewOverrides.js", () => ({
    warnUnmatchedProjectViews,
    reportProjectViewLoadError,
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
    projectWideViews.action = null;
    projectWideViews.executeTransition = null;
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

    describe("Project view checks", () => {
        afterEach(() => {
            vi.unstubAllEnvs();
        });

        scopedIt(
            "checks the project's view files against the model's actions, transitions, and registry keys",
            async () => {
                modelConfig.info = { actions: [{ name: "list" }] };
                workflow.transitions = [{ code: "void", name: "Void" }];
                mount(ViewActionRouter, { props: { app: "a", model: "b", action: "list" } });
                await flushPromises();
                // This package has no src/views, so the root-relative glob finds no files.
                expect(warnUnmatchedProjectViews).toHaveBeenCalledWith([], {
                    app: "a",
                    model: "b",
                    actionNames: ["list"],
                    transitionCodes: ["void"],
                    registryKeys: Object.keys(crudComponents),
                });
            },
        );

        scopedIt("passes each failed project view import to the load error report", async () => {
            modelConfig.info = { actions: [{ name: "archive" }] };
            const wrapper = mount(ViewActionRouter, { props: { app: "a", model: "b", action: "archive" } });
            await vi.waitFor(() => expect(wrapper.findComponent(ActionOnlyStub).exists()).toBe(true));
            // This package has no src/views, so the root-relative glob finds no files.
            expect(reportProjectViewLoadError).toHaveBeenCalledWith(
                [],
                "/src/views/ViewActionABArchive.vue",
                expect.anything(),
            );
        });

        scopedIt("skips the check without model info", async () => {
            modelConfig.info = undefined;
            mount(ViewActionRouter, { props: { app: "a", model: "b", action: "list" } });
            await flushPromises();
            expect(warnUnmatchedProjectViews).not.toHaveBeenCalled();
        });

        scopedIt("skips the check outside development builds", async () => {
            vi.stubEnv("DEV", false);
            modelConfig.info = { actions: [{ name: "list" }] };
            mount(ViewActionRouter, { props: { app: "a", model: "b", action: "list" } });
            await flushPromises();
            expect(warnUnmatchedProjectViews).not.toHaveBeenCalled();
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
            expect(crudComponents.list).toHaveBeenCalledWith(
                { app: "a", model: "b", action: "list", pk: "" },
                { findProjectView: expect.any(Function) },
            );
            expect(wrapper.find('[data-qa="crud"]').exists()).toBe(true);
            expect(wrapper.findComponent(ModelActionStub).exists()).toBe(false);
            expect(wrapper.findComponent(ProjectModelStub).exists()).toBe(false);
        });

        scopedIt("uses a project-wide ViewAction when no action-specific view exists", async () => {
            projectWideViews.action = ProjectWideStub;
            modelConfig.info = { actions: [{ name: "approve" }] };
            const wrapper = mount(ViewActionRouter, { props: { app: "a", model: "b", action: "approve" } });
            await vi.waitFor(() => expect(wrapper.findComponent(ProjectWideStub).exists()).toBe(true));
            expect(wrapper.findComponent(ActionStub).exists()).toBe(false);
        });

        scopedIt("uses a project-wide ViewExecuteTransition when no code-specific view exists", async () => {
            projectWideViews.executeTransition = ProjectWideStub;
            workflow.transitions = [{ code: "approve", name: "Approve" }];
            const wrapper = mount(ViewActionRouter, { props: { app: "a", model: "b", action: "approve" } });
            await vi.waitFor(() => expect(wrapper.findComponent(ProjectWideStub).exists()).toBe(true));
            expect(wrapper.findComponent(ExecuteTransitionStub).exists()).toBe(false);
        });
    });

    describe("Built-in action resolution through findProjectView", () => {
        scopedIt("uses the model-specific project view", async () => {
            modelConfig.info = { actions: [{ name: "read" }] };
            const wrapper = mount(ViewActionRouter, { props: { app: "a", model: "b", action: "read", pk: "1" } });
            await vi.waitFor(() => expect(wrapper.findComponent(ProjectModelStub).exists()).toBe(true));
        });

        scopedIt("uses the project-wide view when the model-specific view is absent", async () => {
            modelConfig.info = { actions: [{ name: "read" }] };
            const wrapper = mount(ViewActionRouter, { props: { app: "a", model: "c", action: "read", pk: "1" } });
            await vi.waitFor(() => expect(wrapper.findComponent(ProjectWideStub).exists()).toBe(true));
        });

        scopedIt("uses the loader's fallback when no project view exists", async () => {
            modelConfig.info = { actions: [{ name: "update" }] };
            const wrapper = mount(ViewActionRouter, { props: { app: "a", model: "b", action: "update", pk: "1" } });
            await vi.waitFor(() => expect(wrapper.findComponent(CrudStub).exists()).toBe(true));
        });
    });
});
