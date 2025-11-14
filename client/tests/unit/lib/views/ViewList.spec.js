import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { SEARCH_PARAM } from "@vueda/utils/constants.js";
import { defineComponent, h, ref } from "vue";

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

const mockedUseWorkflowTransitions = vi.fn();
vi.mock("@vueda/use/useWorkflowTransitions.js", () => ({
    useWorkflowTransitions: mockedUseWorkflowTransitions,
}));

const mockedUseFilteredActions = vi.fn();
vi.mock("@vueda/use/useFilteredActions", () => ({
    useFilteredActions: mockedUseFilteredActions,
}));

const mockedUseSlotNameResolver = vi.fn(() => ({ name: "button" }));
vi.mock("@vueda/use/useSlotNameResolver.js", () => ({
    useSlotNameResolver: mockedUseSlotNameResolver,
}));

const mockedUseTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
}));

const mockedUseList = vi.fn();
vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return { ...actual, useList: mockedUseList };
});

vi.mock("@vueda/router/getCrud.js", () => ({
    getCRUDForTo: vi.fn(async () => ({})),
}));

const createListPreferenceStoreMock = () => ({
    setSorting: vi.fn(),
    getSorting: vi.fn(),
    setFilters: vi.fn(),
    getFilters: vi.fn(),
    setHiddenColumns: vi.fn(),
    getHiddenColumns: vi.fn(),
});
const listPreferenceStoreMock = createListPreferenceStoreMock();
const storeListPreferenceMock = vi.fn(() => listPreferenceStoreMock);
vi.mock("@vueda/stores/storeListPreference.js", () => ({
    storeListPreference: storeListPreferenceMock,
}));

const ErrorDisplayStub = defineComponent({
    name: "ErrorDisplayStub",
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "error-display", ...attrs });
    },
});
const FilterGroupStub = defineComponent({
    name: "FilterGroupStub",
    emits: ["filter-change", "query-change", "hide-filter-form"],
    setup(_, { slots, attrs }) {
        return () =>
            h(
                "div",
                { "data-qa": "filter-group", ...attrs },
                Object.keys(slots).map((n) => h("div", { "data-slot": n }, slots[n] ? slots[n]() : null)),
            );
    },
});
const FormFeedbackStub = defineComponent({
    name: "FormFeedbackStub",
    props: ["type"],
    setup(props) {
        return () => h("div", { "data-qa": `form-feedback-${props.type}` });
    },
});
const LinkModelViewStub = defineComponent({
    name: "LinkModelViewStub",
    props: ["view"],
    setup(props) {
        return () => h("div", { "data-qa": "link-model-view", "data-view": props.view });
    },
});
let objectsGridProps;
let multiSelectProps;
const ObjectsGridStub = defineComponent({
    name: "ObjectsGridStub",
    props: ["fields"],
    setup(props, { slots, attrs }) {
        objectsGridProps = props;
        return () => h("div", { "data-qa": "objects-grid", ...attrs }, slots.default ? slots.default() : null);
    },
});
const PageTitleStub = defineComponent({
    name: "PageTitleStub",
    props: ["title"],
    setup(props, { slots, attrs }) {
        return () =>
            h(
                "div",
                { "data-qa": "page-title", "data-title": props.title, ...attrs },
                Object.keys(slots).map((n) => h("div", { "data-slot": n }, slots[n] ? slots[n]() : null)),
            );
    },
});
const PaginationComponentStub = defineComponent({
    name: "PaginationComponentStub",
    emits: ["update:showing-all-pages"],
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "pagination-component", ...attrs });
    },
});
const StickyBarStub = defineComponent({
    name: "StickyBarStub",
    setup(_, { slots, attrs }) {
        return () => h("div", { "data-qa": "sticky-bar", ...attrs }, slots.default ? slots.default() : null);
    },
});
const InputGroupStub = defineComponent({
    name: "InputGroupStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "input-group" }, slots.default ? slots.default() : null);
    },
});
const InputTextStub = defineComponent({
    name: "InputTextStub",
    props: ["modelValue"],
    emits: ["update:model-value", "search"],
    setup(props, { attrs, emit }) {
        return () =>
            h("input", {
                "data-qa": "input-text",
                value: props.modelValue,
                ...attrs,
                onInput: (e) => emit("update:model-value", e.target.value),
                onSearch: () => emit("search"),
            });
    },
});
const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["label"],
    emits: ["click"],
    setup(props, { emit }) {
        return () => h("button", { "data-qa": "button", "data-label": props.label, onClick: () => emit("click") });
    },
});
const CheckboxStub = defineComponent({
    name: "CheckboxStub",
    props: ["modelValue", "value", "inputId"],
    emits: ["update:modelValue"],
    setup(props, { emit, attrs }) {
        return () =>
            h("input", {
                type: "checkbox",
                "data-qa": "checkbox",
                value: props.value,
                id: props.inputId,
                ...attrs,
                onChange: () => emit("update:modelValue", props.value),
            });
    },
});
const MultiSelectStub = defineComponent({
    name: "MultiSelectStub",
    props: ["modelValue", "options", "optionValue", "optionLabel", "loading", "size"],
    emits: ["update:modelValue"],
    setup(props, { slots, attrs }) {
        return () => {
            multiSelectProps = {
                modelValue: Array.isArray(props.modelValue) ? [...props.modelValue] : props.modelValue,
                options: Array.isArray(props.options) ? props.options.map((option) => ({ ...option })) : props.options,
                optionValue: props.optionValue,
                optionLabel: props.optionLabel,
                loading: props.loading,
                size: props.size,
            };
            return h("div", { "data-qa": "multi-select", ...attrs }, slots.default ? slots.default() : null);
        };
    },
});

vi.mock("@vueda/components/ErrorDisplay.vue", () => ({ default: ErrorDisplayStub }));
vi.mock("@vueda/components/FilterGroup.vue", () => ({ default: FilterGroupStub }));
vi.mock("@vueda/components/FormFeedback.vue", () => ({ default: FormFeedbackStub }));
vi.mock("@vueda/components/LinkModelView.vue", () => ({ default: LinkModelViewStub }));
vi.mock("@vueda/components/ObjectsGrid.vue", () => ({ default: ObjectsGridStub }));
vi.mock("@vueda/components/PageTitle.vue", () => ({ default: PageTitleStub }));
vi.mock("@vueda/components/PaginationComponent.vue", () => ({ default: PaginationComponentStub }));
vi.mock("@vueda/components/StickyBar.vue", () => ({ default: StickyBarStub }));
vi.mock("primevue/inputgroup", () => ({ default: InputGroupStub }));
vi.mock("primevue/inputtext", () => ({ default: InputTextStub }));
vi.mock("primevue/button", () => ({ default: ButtonStub }));
vi.mock("primevue/checkbox", () => ({ default: CheckboxStub }));
vi.mock("primevue/multiselect", () => ({ default: MultiSelectStub }));

const route = { query: {} };
const routerPush = vi.fn();
vi.mock("vue-router", () => ({
    useRoute: () => route,
    useRouter: () => ({ push: routerPush }),
}));

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    ({ provideStore, mockedProvide, mockedInject } = mockProvideInject(vi));
    return { __esModule: true, ...actual, inject: mockedInject, provide: mockedProvide };
});

let ViewList, vue, modelConfig, instanceList;

const resetListPreferenceStoreMock = () => {
    storeListPreferenceMock.mockClear();
    storeListPreferenceMock.mockImplementation(() => listPreferenceStoreMock);
    listPreferenceStoreMock.setSorting.mockReset();
    listPreferenceStoreMock.getSorting.mockReset();
    listPreferenceStoreMock.setFilters.mockReset();
    listPreferenceStoreMock.getFilters.mockReset();
    listPreferenceStoreMock.setHiddenColumns.mockReset();
    listPreferenceStoreMock.getHiddenColumns.mockReset();
    listPreferenceStoreMock.getHiddenColumns.mockReturnValue([]);
    listPreferenceStoreMock.getFilters.mockReturnValue(undefined);
    listPreferenceStoreMock.getSorting.mockReturnValue(null);
};

beforeEach(async () => {
    vue = await vi.importActual("vue");
    objectsGridProps = undefined;
    multiSelectProps = undefined;
    route.query = {};
    routerPush.mockReset();
    routerPush.mockImplementation(({ query }) => {
        route.query = { ...(query || {}) };
        return Promise.resolve();
    });
    resetListPreferenceStoreMock();
    modelConfig = vue.reactive({
        loading: vue.ref(false),
        errored: vue.ref(false),
        error: vue.ref(null),
        clearError: vi.fn(),
        info: { pk: "id" },
        config: {
            displayFields: ["field__name"],
            fieldDetails: { field__name: {} },
            verboseNamePlural: "items",
            actionDetails: {},
            fetchFields: [],
        },
    });
    mockedUseModelConfig.mockReturnValue(modelConfig);
    mockedUseIsActive.mockReturnValue(ref(true));
    mockedUseWorkflowTransitions.mockReturnValue(
        vue.readonly(
            vue.reactive({
                transitions: [],
                loading: ref(false),
                error: ref(null),
                errored: ref(false),
                clearError: vi.fn(),
            }),
        ),
    );
    mockedUseFilteredActions.mockReturnValue(vue.reactive({ actions: [] }));
    instanceList = {
        state: vue.reactive({
            loading: false,
            errored: false,
            error: null,
            order: [],
            sorted: [],
            objects: [],
            objectsInOrder: [],
            relatedObjects: [],
            calculatedObjects: [],
            paginateInfo: { perPage: 10, totalRecords: 0, totalPages: 1 },
            columnTotals: {},
        }),
        clearError: vi.fn(),
        clearList: vi.fn(),
        list: vi.fn(),
    };
    mockedUseList.mockReturnValue(instanceList);
    ViewList = (await import("@vueda/views/ViewList.vue")).default;
    provideStore.clear();
});

afterEach(() => {
    vi.clearAllMocks();
});

scopedIt("calls useLookupContext if lookup context is missing", () => {
    mockedInject.mockReturnValueOnce(null);
    mount(ViewList, { props: { app: "app", model: "model" } });
    expect(mockedUseLookupContext).toHaveBeenCalled();
});

scopedIt("does not call useLookupContext when lookup context exists", () => {
    mockedInject.mockReturnValueOnce({});
    mount(ViewList, { props: { app: "app", model: "model" } });
    expect(mockedUseLookupContext).not.toHaveBeenCalled();
});

scopedIt("translates expanded field names for ObjectsGrid", async () => {
    mockedInject.mockReturnValueOnce({});
    const wrapper = mount(ViewList, {
        props: {
            app: "a",
            model: "b",
            extraFieldObjects: [{ name: "foo__bar", label: "Foo" }],
        },
    });
    await vue.nextTick();
    const fields = objectsGridProps.fields;
    expect(fields[0]).toEqual({ name: "foo__bar", label: "Foo", value: "foo.bar" });
    expect(fields[1]).toEqual({ name: "field__name", value: "field.name" });
    wrapper.unmount();
});

scopedIt("allows toggling show all pages", async () => {
    mockedInject.mockReturnValueOnce({});
    modelConfig.config.allowShowAllPages = true;
    const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
    await vue.nextTick();
    const pagination = wrapper.get('[data-qa="pagination-component"]');
    expect(pagination.attributes("allow-show-all-pages")).toBe("true");

    const initialClearListCalls = instanceList.clearList.mock.calls.length;
    const initialListCalls = instanceList.list.mock.calls.length;
    wrapper.findComponent(PaginationComponentStub).vm.$emit("update:showing-all-pages", true);
    await vue.nextTick();

    expect(instanceList.clearList.mock.calls.length).toBe(initialClearListCalls + 1);
    expect(instanceList.list.mock.calls.length).toBe(initialListCalls + 1);
    wrapper.unmount();
});

scopedIt("passes total record count to pagination", async () => {
    mockedInject.mockReturnValueOnce({});
    modelConfig.config.showTotalRecordNum = true;
    instanceList.state.paginateInfo.totalRecords = 42;
    const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
    await vue.nextTick();
    const pagination = wrapper.get('[data-qa="pagination-component"]');
    expect(pagination.attributes("show-total-record-num")).toBe("true");
    expect(pagination.attributes("total-records")).toBe("42");
    wrapper.unmount();
});

scopedIt("renders column selector when column hiding allowed", async () => {
    mockedInject.mockReturnValueOnce({});
    modelConfig.config.allowColumnHiding = true;
    const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
    await vue.nextTick();
    await vue.nextTick();

    expect(wrapper.find('[data-qa="multi-select"]').exists()).toBe(true);
    expect(multiSelectProps.modelValue).toEqual(["field__name"]);
    expect(multiSelectProps.options).toEqual([{ label: "Field Name", value: "field__name" }]);
    wrapper.unmount();
});

scopedIt("initializes columns using stored hidden preferences", async () => {
    mockedInject.mockReturnValueOnce({});
    modelConfig.config.allowColumnHiding = true;
    modelConfig.config.displayFields = ["field__name", "other_field"];
    modelConfig.config.fieldDetails.other_field = {};
    listPreferenceStoreMock.getHiddenColumns.mockReturnValue(["other_field"]);

    const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
    await vue.nextTick();
    await vue.nextTick();

    expect(listPreferenceStoreMock.getHiddenColumns).toHaveBeenCalledWith({ app: "app", model: "model" });
    expect(multiSelectProps.modelValue).toEqual(["field__name"]);
    wrapper.unmount();
});

scopedIt("persists hidden column selections to the preference store", async () => {
    mockedInject.mockReturnValueOnce({});
    modelConfig.config.allowColumnHiding = true;
    modelConfig.config.displayFields = ["field__name", "other_field"];
    modelConfig.config.fieldDetails.other_field = {};

    const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
    await vue.nextTick();
    await vue.nextTick();

    listPreferenceStoreMock.setHiddenColumns.mockClear();
    wrapper.findComponent(MultiSelectStub).vm.$emit("update:modelValue", ["other_field"]);
    await vue.nextTick();

    expect(listPreferenceStoreMock.setHiddenColumns).toHaveBeenCalledWith({ app: "app", model: "model" }, [
        "field__name",
    ]);
    wrapper.unmount();
});

scopedIt("loads stored filters from the preference store", async () => {
    mockedInject.mockReturnValueOnce({});
    const storedFilters = { [SEARCH_PARAM]: "persisted" };
    listPreferenceStoreMock.getFilters.mockReturnValue(storedFilters);

    const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
    await vue.nextTick();
    await vue.nextTick();

    expect(listPreferenceStoreMock.getFilters).toHaveBeenCalledWith({ app: "app", model: "model" });
    expect(routerPush).toHaveBeenCalledWith({ query: storedFilters });
    wrapper.unmount();
});

scopedIt("saves search queries to the preference store", async () => {
    mockedInject.mockReturnValueOnce({});
    const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
    await vue.nextTick();
    await vue.nextTick();

    listPreferenceStoreMock.setFilters.mockClear();
    const input = wrapper.findComponent(InputTextStub);
    input.vm.$emit("update:model-value", "search-term");
    await vue.nextTick();
    input.vm.$emit("search");
    await vue.nextTick();

    expect(listPreferenceStoreMock.setFilters).toHaveBeenLastCalledWith(
        { app: "app", model: "model" },
        { [SEARCH_PARAM]: "search-term" },
    );
    wrapper.unmount();
});

scopedIt("restores stored sorting preferences", async () => {
    mockedInject.mockReturnValueOnce({});
    modelConfig.config.sortables = ["field1", "field2"];
    const storedSorting = ["field1", "field2"];
    listPreferenceStoreMock.getSorting.mockReturnValue(storedSorting);

    const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
    await vue.nextTick();
    await vue.nextTick();

    expect(listPreferenceStoreMock.getSorting).toHaveBeenCalledWith({ app: "app", model: "model" });
    expect(listPreferenceStoreMock.setSorting).toHaveBeenCalledWith({ app: "app", model: "model" }, storedSorting);
    wrapper.unmount();
});
