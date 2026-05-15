import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";

const mockedUseViewDestroy = vi.fn();

vi.mock("@vueda/use/useViewDestroy.js", () => ({
    useViewDestroy: mockedUseViewDestroy,
}));

const ModelActionFormStub = defineComponent({
    name: "ModelActionFormStub",
    props: ["app", "model", "action", "runAction", "fetchState", "confirmText"],
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

scopedIt("wraps ModelActionForm in a danger-toned card with a banner", () => {
    const modelConfig = reactive({ info: { pk: "id", verboseName: "thing", verboseNamePlural: "things" } });
    mockedUseViewDestroy.mockReturnValue({
        modelConfig,
        handleDelete: vi.fn(),
        instanceList: { state: reactive({}) },
    });

    const wrapper = mount(ViewDestroy, { props: { app: "a", model: "thing", pk: "5" } });

    const card = wrapper.get('[data-qa="view-destroy-card"]');
    expect(card.attributes("data-tone")).toBe("danger");
    const title = wrapper.get('[data-qa="view-destroy-banner-title"]');
    expect(title.text()).toContain("permanently delete");
    expect(title.text()).toContain("thing");
    expect(wrapper.get('[data-qa="view-destroy-banner-description"]').text()).toContain(
        "This action cannot be undone.",
    );
    expect(wrapper.findComponent(ModelActionFormStub).exists()).toBe(true);
});

scopedIt("renders linkedObjectCounts entries in the banner", () => {
    const modelConfig = reactive({ info: { pk: "id", verboseName: "thing", verboseNamePlural: "things" } });
    mockedUseViewDestroy.mockReturnValue({
        modelConfig,
        handleDelete: vi.fn(),
        instanceList: { state: reactive({}) },
    });

    const wrapper = mount(ViewDestroy, {
        props: {
            app: "a",
            model: "thing",
            pk: ["5", "6"],
            linkedObjectCounts: [
                { verboseNamePlural: "comments", count: 12 },
                { verboseNamePlural: "tags", count: 3 },
            ],
        },
    });

    const counts = wrapper.get('[data-qa="view-destroy-banner-counts"]');
    expect(counts.text()).toContain("12 comments will also be removed.");
    expect(counts.text()).toContain("3 tags will also be removed.");
    expect(wrapper.find('[data-qa="view-destroy-banner-description"]').exists()).toBe(false);
    // Bulk title pluralizes via verboseNamePlural.
    expect(wrapper.get('[data-qa="view-destroy-banner-title"]').text()).toContain("2 things");
});

scopedIt("custom banner slot overrides default chrome", () => {
    const modelConfig = reactive({ info: { pk: "id" } });
    mockedUseViewDestroy.mockReturnValue({
        modelConfig,
        handleDelete: vi.fn(),
        instanceList: { state: reactive({}) },
    });

    const wrapper = mount(ViewDestroy, {
        props: { app: "a", model: "thing", pk: "5" },
        slots: { "view-destroy-banner": '<div data-qa="custom-banner">custom</div>' },
    });

    expect(wrapper.find('[data-qa="custom-banner"]').exists()).toBe(true);
    expect(wrapper.find('[data-qa="view-destroy-banner"]').exists()).toBe(false);
});

scopedIt("forwards confirmText to ModelActionForm", () => {
    const modelConfig = reactive({ info: { pk: "id", verboseName: "thing", verboseNamePlural: "things" } });
    mockedUseViewDestroy.mockReturnValue({
        modelConfig,
        handleDelete: vi.fn(),
        instanceList: { state: reactive({}) },
    });

    const wrapper = mount(ViewDestroy, {
        props: { app: "a", model: "thing", pk: ["5", "6"], confirmText: "delete 2 things" },
    });

    const af = wrapper.getComponent(ModelActionFormStub);
    expect(af.props("confirmText")).toBe("delete 2 things");
});

scopedIt("omits confirmText when the prop is not set", () => {
    const modelConfig = reactive({ info: { pk: "id" } });
    mockedUseViewDestroy.mockReturnValue({
        modelConfig,
        handleDelete: vi.fn(),
        instanceList: { state: reactive({}) },
    });

    const wrapper = mount(ViewDestroy, { props: { app: "a", model: "thing", pk: "5" } });

    expect(wrapper.getComponent(ModelActionFormStub).props("confirmText")).toBeUndefined();
});

scopedIt("renders a loading spinner while model info is empty", () => {
    const modelConfig = reactive({ info: {} });
    mockedUseViewDestroy.mockReturnValue({ modelConfig, handleDelete: vi.fn(), instanceList: { state: reactive({}) } });

    const wrapper = mount(ViewDestroy, { props: { app: "a", model: "b", pk: "1" } });

    expect(wrapper.find('[data-qa="spinner"]').exists()).toBe(true);
    expect(wrapper.findComponent(ModelActionFormStub).exists()).toBe(false);
});
