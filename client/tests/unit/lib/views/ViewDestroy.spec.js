import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { computed, defineComponent, h, reactive, ref } from "vue";

const mockedUseViewDestroy = vi.fn();

const ConsequencesBulletsStub = defineComponent({
    name: "ConsequencesBulletsStub",
    inheritAttrs: false,
    props: ["items"],
    setup(props) {
        return () => h("ul", { "data-qa": "view-destroy-cascade", "data-item-count": props.items?.length });
    },
});
vi.mock("@vueda/display/consequences-bullets/ConsequencesBullets.vue", () => ({ default: ConsequencesBulletsStub }));

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
vi.mock("@vueda/views/ModelActionForm.vue", () => ({
    default: ModelActionFormStub,
}));
vi.mock("@vueda/display/loading/LoadingSpinnerBlock.vue", () => ({ default: LoadingSpinnerStub }));

let ViewDestroy;

beforeEach(async () => {
    ViewDestroy = (await import("@vueda/views/ViewDestroy.vue")).default;
    mockedUseViewDestroy.mockReset();
});

describe("lib/views/ViewDestroy.vue", () => {
    describe("Composable integration", () => {
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
    });

    describe("Destructive action presentation", () => {
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

        scopedIt("renders linkedObjectCounts entries via ConsequencesBullets", () => {
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

            const cascade = wrapper.get('[data-qa="view-destroy-cascade"]');
            expect(cascade.attributes("data-item-count")).toBe("2");
            const items = wrapper.getComponent(ConsequencesBulletsStub).props("items");
            expect(items[0]).toMatchObject({
                label: "12 comments",
                description: "will also be removed",
                tone: "danger",
            });
            expect(items[1]).toMatchObject({ label: "3 tags", description: "will also be removed", tone: "danger" });
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
    });

    describe("Typed confirmation", () => {
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
    });

    describe("Page title", () => {
        // A layout establishes the context above both its PageTitle display and the routed view,
        // so mount the view under a host that takes the display role.
        const mountUnderPageTitleHost = (overrides = {}) => {
            let context;
            const Host = defineComponent({
                name: "PageTitleHost",
                setup() {
                    context = usePageTitle();
                    return () => h(ViewDestroy, { app: "a", model: "thing", pk: "5", ...overrides });
                },
            });
            const wrapper = mount(Host);
            return { wrapper, context };
        };

        scopedIt("contributes the composable's title and loading state", () => {
            const modelConfig = reactive({ info: { pk: "id" } });
            mockedUseViewDestroy.mockReturnValue({
                modelConfig,
                handleDelete: vi.fn(),
                instanceList: { state: reactive({}) },
                titleStr: ref("Delete Widget"),
                pageLoading: ref(false),
            });

            const { context } = mountUnderPageTitleHost();

            expect(context.current.value).toEqual({ title: "Delete Widget", loading: false });
        });

        scopedIt("tracks the composable rather than snapshotting it at registration", async () => {
            const modelConfig = reactive({ info: { pk: "id" } });
            const loading = ref(true);
            mockedUseViewDestroy.mockReturnValue({
                modelConfig,
                handleDelete: vi.fn(),
                instanceList: { state: reactive({}) },
                titleStr: computed(() => (loading.value ? "Delete Thing" : "Delete Widget")),
                pageLoading: loading,
            });

            const { context } = mountUnderPageTitleHost();
            expect(context.current.value).toEqual({ title: "Delete Thing", loading: true });

            loading.value = false;
            expect(context.current.value).toEqual({ title: "Delete Widget", loading: false });
        });

        // The spinner branch replaces the whole template, so the title has to come from the
        // script, not from a themed element inside it.
        scopedIt("contributes a title while the model info is still empty", () => {
            const modelConfig = reactive({ info: {} });
            mockedUseViewDestroy.mockReturnValue({
                modelConfig,
                handleDelete: vi.fn(),
                instanceList: { state: reactive({}) },
                titleStr: ref("Delete Thing"),
                pageLoading: ref(true),
            });

            const { wrapper, context } = mountUnderPageTitleHost();

            expect(wrapper.find('[data-qa="spinner"]').exists()).toBe(true);
            expect(context.current.value).toEqual({ title: "Delete Thing", loading: true });
        });

        // A view mounted with no layout above it (a standalone harness) must not throw.
        scopedIt("is a no-op with no page-title context above it", () => {
            const modelConfig = reactive({ info: { pk: "id" } });
            mockedUseViewDestroy.mockReturnValue({
                modelConfig,
                handleDelete: vi.fn(),
                instanceList: { state: reactive({}) },
                titleStr: ref("Delete Widget"),
                pageLoading: ref(false),
            });

            const wrapper = mount(ViewDestroy, { props: { app: "a", model: "thing", pk: "5" } });

            expect(wrapper.getComponent(ModelActionFormStub).exists()).toBe(true);
        });
    });

    describe("Loading state", () => {
        scopedIt("renders a loading spinner while model info is empty", () => {
            const modelConfig = reactive({ info: {} });
            mockedUseViewDestroy.mockReturnValue({
                modelConfig,
                handleDelete: vi.fn(),
                instanceList: { state: reactive({}) },
            });

            const wrapper = mount(ViewDestroy, { props: { app: "a", model: "b", pk: "1" } });

            expect(wrapper.find('[data-qa="spinner"]').exists()).toBe(true);
            expect(wrapper.findComponent(ModelActionFormStub).exists()).toBe(false);
        });
    });
});
