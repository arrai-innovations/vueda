import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

var provideStore, mockedProvide, mockedInject;

const mockedUseList = vi.fn();
const mockedUseIsActive = vi.fn();
const mockedUseLookupContext = vi.fn();
const mockedUseModelConfig = vi.fn();

vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return {
        ...actual,
        useList: mockedUseList,
    };
});
vi.mock("@vueda/use/useIsActive.js", async () => {
    const actual = await vi.importActual("@vueda/use/useIsActive.js");
    return {
        ...actual,
        useIsActive: mockedUseIsActive,
    };
});
vi.mock("@vueda/use/useLookupContext.js", () => ({
    useLookupContext: mockedUseLookupContext,
}));
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: mockedUseModelConfig,
}));

const ActionFormStub = defineComponent({
    name: "ActionFormStub",
    props: ["app", "model", "action", "objects", "runAction", "state"],
    setup(props, { slots, attrs }) {
        return () =>
            h(
                "div",
                {
                    "data-qa": "action-form",
                    "data-app": props.app,
                    "data-model": props.model,
                    "data-action": props.action,
                    ...attrs,
                },
                Object.keys(slots).map((n) => h("div", { "data-slot": n }, slots[n] ? slots[n]() : null)),
            );
    },
});
vi.mock("@vueda/components/ActionForm.vue", () => ({ default: ActionFormStub }));

const LoadingSpinnerBlockStub = defineComponent({
    name: "LoadingSpinnerBlockStub",
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "loading-spinner-block", ...attrs });
    },
});
vi.mock("@vueda/components/LoadingSpinnerBlock.vue", () => ({ default: LoadingSpinnerBlockStub }));

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    ({ provideStore, mockedProvide, mockedInject } = mockProvideInject(vi));
    return { __esModule: true, ...actual, inject: mockedInject, provide: mockedProvide };
});

let ViewActivate, vue, mockInstanceList, modelConfig;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    modelConfig = vue.reactive({ info: { pk: "id" }, loading: false });
    mockedUseModelConfig.mockReturnValue(modelConfig);
    mockedUseIsActive.mockReturnValue(vue.ref(true));
    mockInstanceList = {
        state: vue.reactive({ objects: [], errored: false, error: null }),
        executeAction: vi.fn().mockResolvedValue(),
    };
    mockedUseList.mockReturnValue(mockInstanceList);
    ViewActivate = (await import("@vueda/views/ViewActivate.vue")).default;
    provideStore.clear();
    mockedInject.mockReset();
});

afterEach(() => {
    vi.clearAllMocks();
});

scopedIt("calls useLookupContext if lookup context is missing", () => {
    mockedInject.mockReturnValueOnce(null);
    mount(ViewActivate, { props: { app: "a", model: "b", pk: "1" } });
    expect(mockedUseLookupContext).toHaveBeenCalled();
});

scopedIt("does not call useLookupContext when lookup context exists", () => {
    mockedInject.mockReturnValueOnce({});
    mount(ViewActivate, { props: { app: "a", model: "b", pk: "1" } });
    expect(mockedUseLookupContext).not.toHaveBeenCalled();
});

scopedIt("renders spinner when model config info is empty", () => {
    mockedInject.mockReturnValueOnce({});
    modelConfig.info = {};
    const wrapper = mount(ViewActivate, { props: { app: "app", model: "model", pk: "1" } });
    expect(wrapper.find('[data-qa="loading-spinner-block"]').exists()).toBe(true);
    expect(wrapper.find('[data-qa="action-form"]').exists()).toBe(false);
});

scopedIt("passes props to ActionForm when loaded", () => {
    mockedInject.mockReturnValueOnce({});
    const wrapper = mount(ViewActivate, { props: { app: "myApp", model: "myModel", pk: "id123" } });
    const af = wrapper.find('[data-qa="action-form"]');
    expect(af.exists()).toBe(true);
    expect(af.attributes("data-app")).toBe("myApp");
    expect(af.attributes("data-model")).toBe("myModel");
    expect(af.attributes("data-action")).toBe("activate");
});

scopedIt("runAction executes list action and throws on error", async () => {
    mockedInject.mockReturnValueOnce({});
    const wrapper = mount(ViewActivate, { props: { app: "app", model: "model", pk: "1" } });
    const runAction = wrapper.findComponent(ActionFormStub).props("runAction");
    await expect(runAction()).resolves.not.toThrow();
    expect(mockInstanceList.executeAction).toHaveBeenCalled();
    mockInstanceList.state.errored = true;
    mockInstanceList.state.error = new Error("boom");
    await expect(runAction()).rejects.toThrow("boom");
});
