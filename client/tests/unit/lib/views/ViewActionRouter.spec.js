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
const TransitionStub = defineComponent({
    name: "TransitionStub",
    setup() {
        return () => h("div", { "data-qa": "transition" });
    },
});
const CrudStub = defineComponent({
    name: "CrudStub",
    setup() {
        return () => h("div", { "data-qa": "crud" });
    },
});

vi.mock("@vueda/views/ViewLoading.vue", () => ({ default: LoadingStub }));
vi.mock("@vueda/views/ViewAction.vue", () => ({ default: ActionStub }));
vi.mock("@vueda/views/ViewActionNotFound.vue", () => ({ default: NotFoundStub }));
vi.mock("@vueda/views/ViewWorkFlowTransition.vue", () => ({ default: TransitionStub }));

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

const crudComponents = { list: vi.fn(async () => CrudStub) };
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

scopedIt("shows loading component when model config is loading", async () => {
    modelConfig.loading = true;
    const wrapper = mount(ViewActionRouter, {
        props: { app: "app", model: "model", action: "list" },
    });
    await flushPromises();
    expect(wrapper.find('[data-qa="loading"]').exists()).toBe(true);
});

scopedIt("renders workflow transition view for transition action", async () => {
    const wrapper = mount(ViewActionRouter, {
        props: { app: "a", model: "b", action: "transition" },
    });
    await flushPromises();
    expect(wrapper.find('[data-qa="transition"]').exists()).toBe(true);
});

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
