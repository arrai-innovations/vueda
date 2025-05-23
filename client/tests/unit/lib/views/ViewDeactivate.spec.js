import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

var provideStore, mockedProvide, mockedInject;

const mockedUseIsActive = vi.fn();
const mockedUseModelConfig = vi.fn();
const mockedUseLookupContext = vi.fn();
const mockedUseList = vi.fn();

vi.mock("@vueda/use/useIsActive.js", () => ({
    useIsActive: mockedUseIsActive,
}));
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: mockedUseModelConfig,
}));
vi.mock("@vueda/use/useLookupContext.js", () => ({
    useLookupContext: mockedUseLookupContext,
}));
vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return {
        __esModule: true,
        ...actual,
        useList: mockedUseList,
    };
});

const ActionFormStub = defineComponent({
    name: "ActionFormStub",
    props: ["app", "model", "action"],
    setup(props, { attrs, slots }) {
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
                Object.keys(slots).map((name) => h("div", { "data-slot": name }, slots[name] ? slots[name]() : null)),
            );
    },
});
vi.mock("@vueda/components/ActionForm.vue", () => ({
    default: ActionFormStub,
}));
const LoadingSpinnerBlockStub = defineComponent({
    name: "LoadingSpinnerBlockStub",
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "spinner", ...attrs });
    },
});
vi.mock("@vueda/components/LoadingSpinnerBlock.vue", () => ({
    default: LoadingSpinnerBlockStub,
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

let ViewDeactivate, vue, modelConfig, instanceList;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    modelConfig = vue.reactive({
        info: { pk: "id" },
        loading: false,
    });
    instanceList = {
        state: vue.reactive({ objects: [], errored: false, error: null }),
        executeAction: vi.fn().mockResolvedValue(),
    };
    mockedUseIsActive.mockReturnValue(vue.ref(true));
    mockedUseModelConfig.mockReturnValue(modelConfig);
    mockedUseList.mockReturnValue(instanceList);
    ViewDeactivate = (await import("@vueda/views/ViewDeactivate.vue")).default;
    provideStore.clear();
});

afterEach(() => {
    vi.clearAllMocks();
});

scopedIt("calls useLookupContext if lookup context is missing", () => {
    mockedInject.mockReturnValueOnce(null);
    mount(ViewDeactivate, { props: { app: "a", model: "b", pk: "1" } });
    expect(mockedUseLookupContext).toHaveBeenCalled();
});

scopedIt("does not call useLookupContext when lookup context exists", () => {
    mockedInject.mockReturnValueOnce({});
    mount(ViewDeactivate, { props: { app: "a", model: "b", pk: "1" } });
    expect(mockedUseLookupContext).not.toHaveBeenCalled();
});

scopedIt("renders form and handles deactivation", async () => {
    mockedInject.mockReturnValueOnce({});
    const wrapper = mount(ViewDeactivate, {
        props: { app: "myApp", model: "thing", pk: "9" },
        attrs: { foo: "bar" },
    });

    const form = wrapper.find('[data-qa="action-form"]');
    expect(form.attributes("data-app")).toBe("myApp");
    expect(form.attributes("data-model")).toBe("thing");
    expect(form.attributes("data-action")).toBe("deactivate");

    await wrapper.vm.handleDeactivate();
    expect(instanceList.executeAction).toHaveBeenCalled();

    instanceList.state.errored = true;
    instanceList.state.error = new Error("fail");
    await expect(wrapper.vm.handleDeactivate()).rejects.toThrow("fail");
});

scopedIt("shows spinner when model config is empty", () => {
    mockedInject.mockReturnValueOnce({});
    modelConfig.info = {};
    const wrapper = mount(ViewDeactivate, { props: { app: "a", model: "b", pk: "1" } });
    expect(wrapper.find('[data-qa="spinner"]').exists()).toBe(true);
});
