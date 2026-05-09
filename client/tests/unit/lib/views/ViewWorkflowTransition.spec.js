import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

var provideStore, mockedProvide, mockedInject;

const mockedUseLookupContext = vi.fn();
vi.mock("@vueda/use/useLookupContext.js", () => ({
    useLookupContext: mockedUseLookupContext,
}));

const mockedUseModelConfig = vi.fn();
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: mockedUseModelConfig,
}));

const toastMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    message: vi.fn(),
};
vi.mock("vue-sonner", () => ({ toast: toastMock }));

const routerBack = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: () => ({ back: routerBack }),
}));

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["disabled", "type"],
    setup(props, { attrs, slots }) {
        return () =>
            h("button", { "data-qa": "button", "data-disabled": String(props.disabled), ...attrs }, slots.default?.());
    },
});
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));

const RadioGroupStub = defineComponent({
    name: "RadioGroupStub",
    props: ["modelValue", "name"],
    emits: ["update:modelValue"],
    setup(props, { slots }) {
        return () => h("div", { "data-qa": "radio-group" }, slots.default?.());
    },
});
const RadioGroupItemStub = defineComponent({
    name: "RadioGroupItemStub",
    props: ["id", "value"],
    setup(props) {
        return () => h("input", { type: "radio", "data-qa": "radio-group-item", value: props.value });
    },
});
vi.mock("@vueda/controls/radio-group/RadioGroup.vue", () => ({ default: RadioGroupStub }));
vi.mock("@vueda/controls/radio-group/RadioGroupItem.vue", () => ({ default: RadioGroupItemStub }));

const LinkModelViewStub = defineComponent({
    name: "LinkModelViewStub",
    props: ["app", "model", "view", "label"],
    setup(props) {
        return () =>
            h(
                "div",
                {
                    "data-qa": "link-model-view",
                    "data-app": props.app,
                    "data-model": props.model,
                    "data-view": props.view,
                },
                props.label,
            );
    },
});
vi.mock("@vueda/components/LinkModelView.vue", () => ({ default: LinkModelViewStub }));

const PageTitleStub = defineComponent({
    name: "PageTitleStub",
    props: ["loading", "title"],
    setup(props, { slots }) {
        return () =>
            h(
                "div",
                { "data-qa": "page-title", "data-loading": String(props.loading), "data-title": props.title },
                Object.keys(slots).map((n) => h("div", { "data-slot": n }, slots[n] ? slots[n]() : null)),
            );
    },
});
vi.mock("@vueda/components/PageTitle.vue", () => ({ default: PageTitleStub }));

const fetchWorkflowTransition = vi.fn();
const fetchObjectTransitions = vi.fn();
const fetchObjectState = vi.fn();
const executeTransition = vi.fn();

const workflowStore = {
    workflowTransitions: { "a.m": [] },
    objectTransitions: { "a.m": {} },
    objectStates: { "a.m": {} },
    loading: false,
    fetchWorkflowTransition,
    fetchObjectTransitions,
    fetchObjectState,
    executeTransition,
};

vi.mock("@vueda/stores/storeWorkflow.js", () => ({
    storeWorkflow: () => workflowStore,
}));

vi.mock("@vueda/utils/case.js", () => ({
    getAppModelDotName: ({ app, model }) => `${app}.${model}`,
    memoizedStartCase: (s) => s,
}));

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    ({ provideStore, mockedProvide, mockedInject } = mockProvideInject(vi));
    return { __esModule: true, ...actual, inject: mockedInject, provide: mockedProvide };
});

let ViewWorkflowTransition, vue;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    mockedUseModelConfig.mockReturnValue(vue.reactive({ info: { verbose_name: "Thing" } }));
    ViewWorkflowTransition = (await import("@vueda/views/ViewWorkflowTransition.vue")).default;
    provideStore.clear();
    fetchWorkflowTransition.mockClear();
    fetchObjectTransitions.mockClear();
    fetchObjectState.mockClear();
    executeTransition.mockClear();
    workflowStore.objectStates = { "a.m": {} };
    workflowStore.objectTransitions = { "a.m": {} };
    Object.values(toastMock).forEach((fn) => fn.mockClear());
    routerBack.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

scopedIt("calls useLookupContext if lookup context is missing", () => {
    mockedInject.mockReturnValueOnce(null);
    mount(ViewWorkflowTransition, { props: { app: "a", model: "b", pk: "1" } });
    expect(mockedUseLookupContext).toHaveBeenCalled();
});

scopedIt("fetches transitions for each pk in array and computes intersection", async () => {
    mockedInject.mockReturnValueOnce({});
    workflowStore.objectTransitions = {
        "a.m": {
            1: {
                transitions: [
                    { code: "a", name: "A" },
                    { code: "b", name: "B" },
                ],
            },
            2: {
                transitions: [
                    { code: "a", name: "A" },
                    { code: "c", name: "C" },
                ],
            },
        },
    };
    const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: ["1", "2"] } });
    await vue.nextTick();
    expect(fetchObjectTransitions).toHaveBeenCalledWith("a", "m", "1");
    expect(fetchObjectTransitions).toHaveBeenCalledWith("a", "m", "2");
    expect(wrapper.vm.availableTransitions).toEqual([{ code: "a", name: "A" }]);
});

scopedIt("submits transition and shows success toast", async () => {
    mockedInject.mockReturnValueOnce({});
    const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
    wrapper.vm.selectedAction = "a";
    await wrapper.vm.handleSubmit();
    expect(executeTransition).toHaveBeenCalledWith("a", "m", "1", "a", expect.any(Object));
    expect(toastMock.success).toHaveBeenCalledWith("transition succeeded");
    expect(routerBack).toHaveBeenCalled();
});

scopedIt("renders the terminal-state empty branch with state-named title and back CTA", async () => {
    mockedInject.mockReturnValueOnce({});
    workflowStore.objectStates = {
        "a.m": {
            1: { state: { code: "paid", name: "Paid" } },
        },
    };
    workflowStore.objectTransitions = { "a.m": { 1: { transitions: [] } } };
    const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
    await vue.nextTick();
    const empty = wrapper.find('[data-qa="view-workflow-transition-empty"]');
    expect(empty.exists()).toBe(true);
    expect(empty.text()).toContain("No transitions available from Paid.");
    expect(fetchObjectState).toHaveBeenCalledWith("a", "m", "1");
    const backButton = empty.findAll('[data-qa="button"]').at(-1);
    await backButton.trigger("click");
    expect(routerBack).toHaveBeenCalled();
});

scopedIt("falls back to a generic empty title when state name is unavailable", async () => {
    mockedInject.mockReturnValueOnce({});
    workflowStore.objectTransitions = { "a.m": { 1: { transitions: [] } } };
    const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
    await vue.nextTick();
    const empty = wrapper.find('[data-qa="view-workflow-transition-empty"]');
    expect(empty.exists()).toBe(true);
    expect(empty.text()).toContain("No transitions available.");
    expect(empty.text()).not.toContain("from");
});

scopedIt("shows error toast when submission fails", async () => {
    mockedInject.mockReturnValueOnce({});
    executeTransition.mockRejectedValueOnce(new Error("fail"));
    const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
    wrapper.vm.selectedAction = "a";
    await wrapper.vm.handleSubmit();
    expect(toastMock.error).toHaveBeenCalledWith("transition failed");
    expect(routerBack).not.toHaveBeenCalled();
});
