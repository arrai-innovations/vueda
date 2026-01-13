import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";

const mockedUseViewDestroy = vi.fn();

vi.mock("@vueda/use/useViewDestroy.js", () => ({
    useViewDestroy: mockedUseViewDestroy,
}));

const ModelActionFormStub = defineComponent({
    name: "ModelActionFormStub",
    props: ["app", "model", "action", "runAction", "fetchState"],
    setup(props, { attrs, slots }) {
        return () =>
            h(
                "div",
                {
                    "data-qa": "model-action-form",
                    "data-app": props.app,
                    "data-model": props.model,
                    "data-action": props.action,
                    ...attrs,
                },
                Object.keys(slots).map((name) => h("div", { "data-slot": name }, slots[name] ? slots[name]() : null)),
            );
    },
});

const LoadingSpinnerStub = defineComponent({
    name: "LoadingSpinnerStub",
    setup() {
        return () => h("div", { "data-qa": "spinner" });
    },
});
vi.mock("@vueda/components/ModelActionForm.vue", () => ({
    default: ModelActionFormStub,
}));
vi.mock("@vueda/components/LoadingSpinnerBlock.vue", () => ({ default: LoadingSpinnerStub }));

let ViewDestroy;

beforeEach(async () => {
    ViewDestroy = (await import("@vueda/views/ViewDestroy.vue")).default;
    mockedUseViewDestroy.mockReset();
});

scopedIt("renders ActionForm when model config is loaded", () => {
    const state = reactive({});
    const modelConfig = reactive({ info: { pk: "id" } });
    const handleDelete = vi.fn();
    mockedUseViewDestroy.mockReturnValue({ modelConfig, handleDelete, instanceList: { state } });

    const wrapper = mount(ViewDestroy, { props: { app: "app1", model: "thing", pk: "5" } });

    const af = wrapper.getComponent(ModelActionFormStub);
    expect(af.props("app")).toBe("app1");
    expect(af.props("model")).toBe("thing");
    expect(af.props("fetchState")).toBe(state);
    expect(wrapper.find('[data-qa="spinner"]').exists()).toBe(false);

    const arg = mockedUseViewDestroy.mock.calls[0][0];
    expect(arg.app).toBe("app1");
    expect(arg.model).toBe("thing");
    expect(arg.pk).toBe("5");
});

scopedIt("renders a loading spinner while model info is empty", () => {
    const modelConfig = reactive({ info: {} });
    mockedUseViewDestroy.mockReturnValue({ modelConfig, handleDelete: vi.fn(), instanceList: { state: reactive({}) } });

    const wrapper = mount(ViewDestroy, { props: { app: "a", model: "b", pk: "1" } });

    expect(wrapper.find('[data-qa="spinner"]').exists()).toBe(true);
    expect(wrapper.findComponent(ModelActionFormStub).exists()).toBe(false);
});
