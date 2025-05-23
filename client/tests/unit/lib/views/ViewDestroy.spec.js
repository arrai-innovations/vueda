import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";

const mockedUseViewDestroy = vi.fn();

vi.mock("@vueda/use/useViewDestroy.js", () => ({
    useViewDestroy: mockedUseViewDestroy,
}));

const ActionFormStub = defineComponent({
    name: "ActionFormStub",
    props: ["app", "model", "pk", "runAction", "state", "action"],
    setup(props) {
        return () =>
            h("div", {
                "data-qa": "action-form",
                "data-app": props.app,
                "data-model": props.model,
                "data-pk": Array.isArray(props.pk) ? props.pk.join(",") : props.pk,
            });
    },
});

const LoadingSpinnerStub = defineComponent({
    name: "LoadingSpinnerStub",
    setup() {
        return () => h("div", { "data-qa": "spinner" });
    },
});

vi.mock("@vueda/components/ActionForm.vue", () => ({ default: ActionFormStub }));
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

    const af = wrapper.getComponent(ActionFormStub);
    expect(af.props("app")).toBe("app1");
    expect(af.props("model")).toBe("thing");
    expect(af.props("pk")).toBe("5");
    expect(af.props("runAction")).toBe(handleDelete);
    expect(af.props("state")).toBe(state);
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
    expect(wrapper.findComponent(ActionFormStub).exists()).toBe(false);
});
