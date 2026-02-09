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

const toastAdd = vi.fn();
vi.mock("primevue/usetoast", () => ({
    useToast: () => ({ add: toastAdd }),
}));

const routerBack = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: () => ({ back: routerBack }),
}));

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["disabled", "label", "type"],
    setup(props, { attrs }) {
        return () => h("button", { "data-qa": "button", "data-disabled": String(props.disabled), ...attrs });
    },
});
vi.mock("primevue/button", () => ({ default: ButtonStub }));

const RadioButtonStub = defineComponent({
    name: "RadioButtonStub",
    props: ["modelValue", "inputId", "name", "value"],
    emits: ["update:modelValue"],
    setup(props, { emit }) {
        return () =>
            h("input", {
                type: "radio",
                "data-qa": "radio-button",
                value: props.value,
                onChange: () => emit("update:modelValue", props.value),
            });
    },
});
vi.mock("primevue/radiobutton", () => ({ default: RadioButtonStub }));

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
const executeTransition = vi.fn();

const workflowStore = {
    workflowTransitions: { app: { model: { transitions: [] } } },
    objectTransitions: [],
    loading: false,
    fetchWorkflowTransition,
    fetchObjectTransitions,
    executeTransition,
};

vi.mock("@vueda/stores/storeWorkflow.js", () => ({
    storeWorkflow: () => workflowStore,
}));

vi.mock("@vueda/utils/case.js", () => ({
    memoizedStartCase: (s) => s,
}));

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    ({ provideStore, mockedProvide, mockedInject } = mockProvideInject(vi));
    return { __esModule: true, ...actual, inject: mockedInject, provide: mockedProvide };
});

let ViewWorkFlowTransition, vue;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    mockedUseModelConfig.mockReturnValue(vue.reactive({ info: { verbose_name: "Thing" } }));
    ViewWorkFlowTransition = (await import("@vueda/views/ViewWorkFlowTransition.vue")).default;
    provideStore.clear();
    fetchWorkflowTransition.mockClear();
    fetchObjectTransitions.mockClear();
    executeTransition.mockClear();
    toastAdd.mockClear();
    routerBack.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

scopedIt("calls useLookupContext if lookup context is missing", () => {
    mockedInject.mockReturnValueOnce(null);
    mount(ViewWorkFlowTransition, { props: { app: "a", model: "b", pk: "1" } });
    expect(mockedUseLookupContext).toHaveBeenCalled();
});

scopedIt("fetches transitions for each pk in array and computes intersection", async () => {
    mockedInject.mockReturnValueOnce({});
    workflowStore.objectTransitions = [
        {
            id: "1",
            transitions: [
                { code: "a", name: "A" },
                { code: "b", name: "B" },
            ],
        },
        {
            id: "2",
            transitions: [
                { code: "a", name: "A" },
                { code: "c", name: "C" },
            ],
        },
    ];
    const wrapper = mount(ViewWorkFlowTransition, { props: { app: "a", model: "m", pk: ["1", "2"] } });
    await vue.nextTick();
    expect(fetchObjectTransitions).toHaveBeenCalledWith("a", "m", "1");
    expect(fetchObjectTransitions).toHaveBeenCalledWith("a", "m", "2");
    expect(wrapper.vm.availableTransitions).toEqual([{ code: "a", name: "A" }]);
});

scopedIt("submits transition and shows success toast", async () => {
    mockedInject.mockReturnValueOnce({});
    const wrapper = mount(ViewWorkFlowTransition, { props: { app: "a", model: "m", pk: "1" } });
    wrapper.vm.selectedAction = "a";
    await wrapper.vm.handleSubmit();
    expect(executeTransition).toHaveBeenCalledWith("a", "m", "1", "a", expect.any(Object));
    expect(toastAdd).toHaveBeenCalledWith({ severity: "success", summary: "transition succeed" });
    expect(routerBack).toHaveBeenCalled();
});

scopedIt("shows error toast when submission fails", async () => {
    mockedInject.mockReturnValueOnce({});
    executeTransition.mockRejectedValueOnce(new Error("fail"));
    const wrapper = mount(ViewWorkFlowTransition, { props: { app: "a", model: "m", pk: "1" } });
    wrapper.vm.selectedAction = "a";
    await wrapper.vm.handleSubmit();
    expect(toastAdd).toHaveBeenCalledWith({ severity: "error", summary: "transition failed" });
    expect(routerBack).not.toHaveBeenCalled();
});
