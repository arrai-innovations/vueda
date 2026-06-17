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

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: () => "theme" });
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
const FormMessageStub = defineComponent({
    name: "FormMessageStub",
    props: ["type"],
    setup(props) {
        return () => h("div", { "data-qa": `form-message-${props.type}` });
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
// Per-field slot-prop overrides for the rendered `field(<col>)` slots, keyed by
// field name. Lets a test control what `formatted`/`value` a column cell sees.
let columnSlotProps = {};
const ObjectsGridStub = defineComponent({
    name: "ObjectsGridStub",
    props: ["fields", "sorted"],
    emits: ["update:isTable", "update:sorted"],
    setup(props, { slots, attrs }) {
        objectsGridProps = props;
        return () =>
            h("div", { "data-qa": "objects-grid", ...attrs }, [
                slots.default ? slots.default() : null,
                // Mirror the real grid: render each field's `field(<col>)` slot
                // (table + card both map to it) so injected column adapters and
                // consumer slot overrides are exercised.
                ...(props.fields || []).map((field) => {
                    const slot = slots[`field(${field.name})`];
                    if (!slot) {
                        return null;
                    }
                    const slotProps = {
                        field,
                        formatted: `fmt:${field.name}`,
                        value: `val:${field.name}`,
                        pk: 1,
                        ...(columnSlotProps[field.name] || {}),
                    };
                    return h("div", { "data-column": field.name }, slot(slotProps));
                }),
            ]);
    },
});
const MobileSortComponentStub = defineComponent({
    name: "MobileSortComponentStub",
    props: ["visible", "sorted", "sortables"],
    emits: ["update:visible", "update:sorted"],
    setup(props, { slots, attrs }) {
        return () => h("div", { "data-qa": "mobile-sort-component", ...attrs }, slots.default ? slots.default() : null);
    },
});
const PageActionsStub = defineComponent({
    name: "PageActionsStub",
    setup(_, { slots, attrs }) {
        return () => h("div", { "data-qa": "page-actions", ...attrs }, slots.default ? slots.default() : null);
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
const InputGroupInputStub = defineComponent({
    name: "InputGroupInputStub",
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
const InputGroupButtonStub = defineComponent({
    name: "InputGroupButtonStub",
    emits: ["click"],
    setup(_, { emit, slots }) {
        return () => h("button", { "data-qa": "button", onClick: () => emit("click") }, slots.default?.());
    },
});
const ButtonStub = defineComponent({
    name: "ButtonStub",
    emits: ["click"],
    setup(_, { emit, slots }) {
        return () => h("button", { "data-qa": "button", onClick: () => emit("click") }, slots.default?.());
    },
});
const CheckboxStub = defineComponent({
    name: "CheckboxStub",
    props: ["modelValue", "value", "id"],
    emits: ["update:modelValue"],
    setup(props, { emit, attrs }) {
        return () =>
            h("input", {
                type: "checkbox",
                "data-qa": "checkbox",
                value: props.value,
                id: props.id,
                ...attrs,
                onChange: () => emit("update:modelValue", !props.modelValue),
            });
    },
});
let selectProps;
const SelectStub = defineComponent({
    name: "SelectStub",
    props: { modelValue: {}, multiple: { type: Boolean } },
    emits: ["update:modelValue"],
    setup(props, { slots, attrs }) {
        return () => {
            selectProps = {
                modelValue: Array.isArray(props.modelValue) ? [...props.modelValue] : props.modelValue,
                multiple: props.multiple,
            };
            return h("div", { "data-qa": "select", ...attrs }, slots.default ? slots.default() : null);
        };
    },
});
const SelectTriggerStub = defineComponent({
    name: "SelectTriggerStub",
    props: ["size"],
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "select-trigger" }, slots.default ? slots.default() : null);
    },
});
const SelectValueStub = defineComponent({
    name: "SelectValueStub",
    setup(_, { slots }) {
        return () => h("span", { "data-qa": "select-value" }, slots.default ? slots.default() : null);
    },
});
const SelectContentStub = defineComponent({
    name: "SelectContentStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "select-content" }, slots.default ? slots.default() : null);
    },
});
const SelectItemStub = defineComponent({
    name: "SelectItemStub",
    props: ["value"],
    setup(props, { slots }) {
        return () =>
            h("div", { "data-qa": "select-item", "data-value": props.value }, slots.default ? slots.default() : null);
    },
});

vi.mock("@vueda/components/ErrorDisplay.vue", () => ({ default: ErrorDisplayStub }));
vi.mock("@vueda/components/FilterGroup.vue", () => ({ default: FilterGroupStub }));
vi.mock("@vueda/components/FormMessage.vue", () => ({ default: FormMessageStub }));
vi.mock("@vueda/components/LinkModelView.vue", () => ({ default: LinkModelViewStub }));
vi.mock("@vueda/components/ObjectsGrid.vue", () => ({ default: ObjectsGridStub }));
vi.mock("@vueda/components/MobileSortComponent.vue", () => ({ default: MobileSortComponentStub }));
vi.mock("@vueda/components/PageActions.vue", () => ({ default: PageActionsStub }));
vi.mock("@vueda/components/PaginationComponent.vue", () => ({ default: PaginationComponentStub }));
vi.mock("@vueda/components/StickyBar.vue", () => ({ default: StickyBarStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/controls/checkbox/Checkbox.vue", () => ({ default: CheckboxStub }));
vi.mock("@vueda/controls/input-group/InputGroup.vue", () => ({ default: InputGroupStub }));
vi.mock("@vueda/controls/input-group/InputGroupButton.vue", () => ({ default: InputGroupButtonStub }));
vi.mock("@vueda/controls/input-group/InputGroupInput.vue", () => ({ default: InputGroupInputStub }));
vi.mock("@vueda/controls/select/Select.vue", () => ({ default: SelectStub }));
vi.mock("@vueda/controls/select/SelectContent.vue", () => ({ default: SelectContentStub }));
vi.mock("@vueda/controls/select/SelectItem.vue", () => ({ default: SelectItemStub }));
vi.mock("@vueda/controls/select/SelectTrigger.vue", () => ({ default: SelectTriggerStub }));
vi.mock("@vueda/controls/select/SelectValue.vue", () => ({ default: SelectValueStub }));

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
    columnSlotProps = {};
    selectProps = undefined;
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
            sortables: [],
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

scopedIt("renders the mobile sort component when sortables exist and table view is hidden", async () => {
    mockedInject.mockReturnValueOnce({});
    const wrapper = mount(ViewList, {
        props: {
            app: "app",
            model: "model",
        },
    });

    expect(wrapper.find('[data-qa="mobile-sort-component"]').exists()).toBe(false);

    modelConfig.config.sortables = ["name"];
    await vue.nextTick();

    await wrapper.findComponent(ObjectsGridStub).vm.$emit("update:isTable", false);
    await vue.nextTick();

    expect(wrapper.find('[data-qa="mobile-sort-component"]').exists()).toBe(true);
    wrapper.unmount();
});

scopedIt("allows toggling show all pages", async () => {
    mockedInject.mockReturnValueOnce({});
    modelConfig.config.allowShowAllPages = true;
    instanceList.state.paginateInfo.totalRecords = 5;
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
scopedIt("hides pagination when there are no records", async () => {
    mockedInject.mockReturnValueOnce({});
    instanceList.state.paginateInfo.totalRecords = 0;

    const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });

    await vue.nextTick();

    expect(wrapper.find('[data-qa="pagination-component"]').exists()).toBe(false);
    expect(wrapper.find('[data-qa="view-list-pagination"]').exists()).toBe(false);

    wrapper.unmount();
});

scopedIt("wraps pagination in a footer-strip when records exist", async () => {
    mockedInject.mockReturnValueOnce({});
    instanceList.state.paginateInfo.totalRecords = 5;

    const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
    await vue.nextTick();

    const footer = wrapper.get('[data-qa="view-list-pagination"]');
    expect(footer.find('[data-qa="pagination-component"]').exists()).toBe(true);

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
    expect(wrapper.find('[data-qa="select"]').exists()).toBe(true);
    expect(selectProps.modelValue).toEqual(["field__name"]);
    expect(selectProps.multiple).toBe(true);
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
    expect(selectProps.modelValue).toEqual(["field__name"]);
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
    wrapper.findComponent(SelectStub).vm.$emit("update:modelValue", ["other_field"]);
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
    const input = wrapper.findComponent(InputGroupInputStub);
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
scopedIt("applies stored sorting to ObjectsGrid on mount", async () => {
    mockedInject.mockReturnValueOnce({});
    modelConfig.config.sortables = ["created_at", "name"];
    const storedSorting = ["-created_at"];
    listPreferenceStoreMock.getSorting.mockReturnValue(storedSorting);

    const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
    await vue.nextTick();
    await vue.nextTick();

    expect(wrapper.findComponent(ObjectsGridStub).props("sorted")).toEqual(storedSorting);
    wrapper.unmount();
});
scopedIt("propagates mobile sorting updates to preferences and params", async () => {
    mockedInject.mockReturnValueOnce({});
    modelConfig.config.sortables = ["name", "created_at"];
    const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });

    await vue.nextTick();
    await wrapper.findComponent(ObjectsGridStub).vm.$emit("update:isTable", false);
    await vue.nextTick();

    wrapper.findComponent(MobileSortComponentStub).vm.$emit("update:sorted", ["-name", "created_at"]);
    await vue.nextTick();

    expect(listPreferenceStoreMock.setSorting).toHaveBeenCalledWith({ app: "app", model: "model" }, [
        "-name",
        "created_at",
    ]);
    wrapper.unmount();
});

scopedIt("appends new display fields without resetting hidden preferences", async () => {
    mockedInject.mockReturnValueOnce({});
    modelConfig.config.allowColumnHiding = true;
    modelConfig.config.displayFields = ["field1", "field2"];
    modelConfig.config.fieldDetails = {
        field1: {},
        field2: {},
        field3: {},
    };
    let hiddenPreference = ["field1"];
    listPreferenceStoreMock.getHiddenColumns.mockImplementation(() => hiddenPreference);
    listPreferenceStoreMock.setHiddenColumns.mockImplementation((_, hidden) => {
        hiddenPreference = hidden;
    });
    const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
    await vue.nextTick();
    await vue.nextTick();
    expect(listPreferenceStoreMock.getHiddenColumns).toHaveBeenCalledTimes(1);

    modelConfig.config.displayFields = ["field1", "field2", "field3"];

    await vue.nextTick();

    expect(wrapper.vm.columns.columns).toContain("field3");
    expect(listPreferenceStoreMock.getHiddenColumns).toHaveBeenCalledTimes(1);
    expect(listPreferenceStoreMock.setHiddenColumns).toHaveBeenCalledWith({ app: "app", model: "model" }, ["field1"]);
    expect(hiddenPreference).toEqual(["field1"]);
    wrapper.unmount();
});

scopedIt("keeps filter parameters when clearing search input", async () => {
    mockedInject.mockReturnValueOnce({});
    route.query = { [SEARCH_PARAM]: "search-term", filter: "status" };
    const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
    await vue.nextTick();
    await vue.nextTick();

    listPreferenceStoreMock.setFilters.mockClear();
    routerPush.mockClear();

    const input = wrapper.findComponent(InputGroupInputStub);
    input.vm.$emit("update:model-value", "");
    await vue.nextTick();
    input.vm.$emit("search");
    await vue.nextTick();

    expect(listPreferenceStoreMock.setFilters).toHaveBeenCalledWith(
        { app: "app", model: "model" },
        { filter: "status" },
    );
    expect(routerPush).toHaveBeenCalledWith({ query: { filter: "status" } });
    expect(objectsGridProps.sorted).toEqual([]);
    wrapper.unmount();
});

scopedIt("renders the mobile sorter only when table view is off and sortables exist", async () => {
    mockedInject.mockReturnValueOnce({});
    modelConfig.config.sortables = ["name"];
    const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
    await vue.nextTick();
    await wrapper.findComponent(ObjectsGridStub).vm.$emit("update:isTable", false);
    await vue.nextTick();

    expect(wrapper.find('[data-qa="mobile-sort-component"]').exists()).toBe(true);
    modelConfig.config.sortables = [];
    await vue.nextTick();

    expect(wrapper.find('[data-qa="mobile-sort-component"]').exists()).toBe(false);
    wrapper.unmount();
});

scopedIt("does not navigate when there are no stored filters", async () => {
    mockedInject.mockReturnValueOnce({});
    listPreferenceStoreMock.getFilters.mockReturnValue(undefined);

    const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
    await vue.nextTick();
    await vue.nextTick();

    expect(routerPush).not.toHaveBeenCalled();
    wrapper.unmount();
});

describe("type-aware column adapters", () => {
    const CustomColumn = defineComponent({
        name: "CustomColumn",
        props: ["formatted", "extra"],
        setup(props) {
            return () =>
                h("span", { "data-qa": "custom-column", "data-extra": props.extra }, `custom:${props.formatted}`);
        },
    });

    scopedIt("renders a plain column through the ColumnText default", async () => {
        mockedInject.mockReturnValueOnce({});
        const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
        await vue.nextTick();
        const cell = wrapper.find('[data-column="field__name"]');
        expect(cell.exists()).toBe(true);
        // ColumnText reproduces the historical plain-text cell: just `formatted`.
        expect(cell.text()).toBe("fmt:field__name");
        wrapper.unmount();
    });

    scopedIt("lets a consumer field(<col>) slot override the adapter", async () => {
        mockedInject.mockReturnValueOnce({});
        const wrapper = mount(ViewList, {
            props: { app: "app", model: "model" },
            slots: {
                "field(field__name)": (slotProps) =>
                    h("span", { "data-qa": "consumer-cell" }, `consumer:${slotProps.formatted}`),
            },
        });
        await vue.nextTick();
        const cell = wrapper.find('[data-column="field__name"]');
        expect(cell.find('[data-qa="consumer-cell"]').exists()).toBe(true);
        expect(cell.text()).toBe("consumer:fmt:field__name");
        wrapper.unmount();
    });

    scopedIt("uses the columnComponents prop override", async () => {
        mockedInject.mockReturnValueOnce({});
        const wrapper = mount(ViewList, {
            props: { app: "app", model: "model", columnComponents: { field__name: CustomColumn } },
        });
        await vue.nextTick();
        const cell = wrapper.find('[data-column="field__name"]');
        expect(cell.find('[data-qa="custom-column"]').exists()).toBe(true);
        expect(cell.text()).toBe("custom:fmt:field__name");
        wrapper.unmount();
    });

    scopedIt("uses a modelConfig.config.columnComponents override", async () => {
        mockedInject.mockReturnValueOnce({});
        modelConfig.config.columnComponents = { field__name: CustomColumn };
        const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
        await vue.nextTick();
        const cell = wrapper.find('[data-column="field__name"]');
        expect(cell.find('[data-qa="custom-column"]').exists()).toBe(true);
        wrapper.unmount();
    });

    scopedIt("forwards columnProps to the resolved adapter", async () => {
        mockedInject.mockReturnValueOnce({});
        const wrapper = mount(ViewList, {
            props: {
                app: "app",
                model: "model",
                columnComponents: { field__name: CustomColumn },
                columnProps: { field__name: { extra: "EX" } },
            },
        });
        await vue.nextTick();
        const cell = wrapper.find('[data-column="field__name"]');
        expect(cell.find('[data-qa="custom-column"]').attributes("data-extra")).toBe("EX");
        wrapper.unmount();
    });

    scopedIt("prop columnComponents beats modelConfig columnComponents", async () => {
        mockedInject.mockReturnValueOnce({});
        const ConfigColumn = defineComponent({
            name: "ConfigColumn",
            setup: () => () => h("span", { "data-qa": "config-column" }),
        });
        modelConfig.config.columnComponents = { field__name: ConfigColumn };
        const wrapper = mount(ViewList, {
            props: { app: "app", model: "model", columnComponents: { field__name: CustomColumn } },
        });
        await vue.nextTick();
        const cell = wrapper.find('[data-column="field__name"]');
        expect(cell.find('[data-qa="custom-column"]').exists()).toBe(true);
        expect(cell.find('[data-qa="config-column"]').exists()).toBe(false);
        wrapper.unmount();
    });
});
