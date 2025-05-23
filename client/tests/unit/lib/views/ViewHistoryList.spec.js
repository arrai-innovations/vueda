import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

var provideStore, mockedProvide, mockedInject;

const mockedUseLookupContext = vi.fn();
vi.mock("@vueda/use/useLookupContext.js", () => ({
    useLookupContext: mockedUseLookupContext,
}));

const mockedUseIsActive = vi.fn();
vi.mock("@vueda/use/useIsActive.js", () => ({
    useIsActive: mockedUseIsActive,
}));

const mockedUseModelConfig = vi.fn();
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: mockedUseModelConfig,
}));

const mockedUseFormModel = vi.fn();
vi.mock("@vueda/use/useFormModel.js", () => ({
    useFormModel: mockedUseFormModel,
}));

const mockedUseList = vi.fn();
vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return { ...actual, useList: mockedUseList };
});

const mockedUseTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
}));

const routerBack = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: () => ({ back: routerBack }),
}));

let objectsGridProps;
const ObjectsGridStub = defineComponent({
    name: "ObjectsGridStub",
    props: ["fields"],
    setup(props, { attrs, slots }) {
        objectsGridProps = props;
        return () =>
            h(
                "div",
                { "data-qa": "objects-grid", ...attrs },
                Object.keys(slots).map((n) => h("div", { "data-slot": n }, slots[n] ? slots[n]({ obj: {} }) : null)),
            );
    },
});
vi.mock("@vueda/components/ObjectsGrid.vue", () => ({ default: ObjectsGridStub }));

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

const PaginationComponentStub = defineComponent({
    name: "PaginationComponentStub",
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "pagination-component", ...attrs });
    },
});
vi.mock("@vueda/components/PaginationComponent.vue", () => ({ default: PaginationComponentStub }));

const ButtonStub = defineComponent({
    name: "ButtonStub",
    emits: ["click"],
    setup(_, { emit, slots, attrs }) {
        return () =>
            h(
                "button",
                { "data-qa": "prime-button", ...attrs, onClick: () => emit("click") },
                slots.default ? slots.default() : null,
            );
    },
});
vi.mock("primevue/button", () => ({ default: ButtonStub }));

const WidgetReadOnlyStub = defineComponent({
    name: "WidgetReadOnlyStub",
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "widget-read-only", ...attrs });
    },
});
vi.mock("@vueda/widgets/WidgetReadOnly.vue", () => ({ default: WidgetReadOnlyStub }));

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    ({ provideStore, mockedProvide, mockedInject } = mockProvideInject(vi));
    return { __esModule: true, ...actual, inject: mockedInject, provide: mockedProvide };
});

let ViewHistoryList, vue, modelConfig, mockInstanceList;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    objectsGridProps = undefined;
    modelConfig = vue.reactive({
        loading: vue.ref(false),
        info: {
            verbose_name: "Thing",
            pk: "id",
            expand: [{ name: "history", f: { history_date: { label: "Date" } } }],
            fields: {},
        },
        config: {},
    });
    mockedUseModelConfig.mockReturnValue(modelConfig);
    mockedUseIsActive.mockReturnValue(vue.ref(true));
    mockInstanceList = {
        state: vue.reactive({
            loading: false,
            calculatedObjects: [],
            relatedObjects: [],
            objectsInOrder: [],
            perPage: 10,
            totalRecords: 0,
        }),
        clearError: vi.fn(),
    };
    mockedUseList.mockReturnValue(mockInstanceList);
    mockedUseFormModel.mockReturnValue({ fieldComponents: {}, fieldProps: {}, widgetProps: {} });
    ViewHistoryList = (await import("@vueda/views/ViewHistoryList.vue")).default;
    provideStore.clear();
    routerBack.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

scopedIt("calls useLookupContext if lookup context is missing", () => {
    mockedInject.mockReturnValueOnce(null);
    mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
    expect(mockedUseLookupContext).toHaveBeenCalled();
});

scopedIt("does not call useLookupContext when lookup context exists", () => {
    mockedInject.mockReturnValueOnce({});
    mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
    expect(mockedUseLookupContext).not.toHaveBeenCalled();
});

scopedIt("toggles field column based on table mode", async () => {
    mockedInject.mockReturnValueOnce({});
    const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
    await vue.nextTick();
    expect(objectsGridProps.fields.some((f) => f && f.name === "field")).toBe(true);
    wrapper.vm.handleIsTableUpdate(false);
    await vue.nextTick();
    expect(objectsGridProps.fields.some((f) => f && f.name === "field")).toBe(false);
    wrapper.unmount();
});

scopedIt("calls router.back when Back button clicked", async () => {
    mockedInject.mockReturnValueOnce({});
    const wrapper = mount(ViewHistoryList, { props: { app: "a", model: "b", pk: "1" } });
    await wrapper.find('[data-qa="prime-button"]').trigger("click");
    expect(routerBack).toHaveBeenCalled();
    wrapper.unmount();
});
