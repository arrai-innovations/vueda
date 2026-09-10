import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { ORDERING_PARAM, SEARCH_PARAM } from "@vueda/utils/constants.js";
import { defineComponent, h, reactive, ref } from "vue";

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
    init: vi.fn(),
    setSorting: vi.fn(),
    clearSorting: vi.fn(),
    getSorting: vi.fn(),
    setFilters: vi.fn(),
    getFilters: vi.fn(),
    setHiddenColumns: vi.fn(),
    getHiddenColumns: vi.fn(),
    setPerPage: vi.fn(),
    getPerPage: vi.fn(),
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
    props: ["modelValue", "filterables", "filterableDetails", "validFilterables"],
    emits: ["hide-filter-form"],
    setup(_, { slots }) {
        return () =>
            h(
                "div",
                { "data-qa": "filter-group" },
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
    props: ["fields"],
    emits: ["update:isTable"],
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
const SortControlStub = defineComponent({
    name: "SortControlStub",
    props: ["sorted", "sortables", "fieldDetails", "triggerTarget"],
    emits: ["update:sorted"],
    setup(props, { slots, attrs }) {
        return () => h("div", { "data-qa": "sort-control", ...attrs }, slots.default ? slots.default() : null);
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
    emits: ["update:currentPage", "update:perPage"],
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
const StickyChromeStub = defineComponent({
    name: "StickyChromeStub",
    props: ["zone", "reveal", "order"],
    setup(props, { slots }) {
        return () =>
            h(
                "div",
                {
                    "data-qa": "sticky-chrome",
                    "data-zone": props.zone,
                    "data-reveal": props.reveal,
                    "data-order": props.order,
                },
                slots.default ? slots.default() : null,
            );
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
    setup(_, { emit, slots, attrs }) {
        return () => h("button", { "data-qa": "button", ...attrs, onClick: () => emit("click") }, slots.default?.());
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

vi.mock("@vueda/display/error-display/ErrorDisplay.vue", () => ({ default: ErrorDisplayStub }));
vi.mock("@vueda/form/filter/FilterGroup.vue", () => ({ default: FilterGroupStub }));
vi.mock("@vueda/form/form-model/FormMessage.vue", () => ({ default: FormMessageStub }));
vi.mock("@vueda/navigation/link-model-view/LinkModelView.vue", () => ({ default: LinkModelViewStub }));
vi.mock("@vueda/objects-grid/ObjectsGrid.vue", () => ({ default: ObjectsGridStub }));
vi.mock("@vueda/display/sort/SortControl.vue", () => ({ default: SortControlStub }));
vi.mock("@vueda/shell/page-title/PageActions.vue", () => ({ default: PageActionsStub }));
vi.mock("@vueda/navigation/pagination/PaginationFooter.vue", () => ({ default: PaginationComponentStub }));
vi.mock("@vueda/shell/sticky/StickyBar.vue", () => ({ default: StickyBarStub }));
vi.mock("@vueda/shell/sticky/StickyChrome.vue", () => ({ default: StickyChromeStub }));
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

let route = reactive({ params: {}, query: {} });
const routerPush = vi.fn();
const routerReplace = vi.fn();
vi.mock("vue-router", () => ({
    useRoute: () => route,
    useRouter: () => ({ push: routerPush, replace: routerReplace }),
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
    listPreferenceStoreMock.init.mockReset();
    listPreferenceStoreMock.setSorting.mockReset();
    listPreferenceStoreMock.clearSorting.mockReset();
    listPreferenceStoreMock.getSorting.mockReset();
    listPreferenceStoreMock.setFilters.mockReset();
    listPreferenceStoreMock.getFilters.mockReset();
    listPreferenceStoreMock.setHiddenColumns.mockReset();
    listPreferenceStoreMock.getHiddenColumns.mockReset();
    listPreferenceStoreMock.setPerPage.mockReset();
    listPreferenceStoreMock.getPerPage.mockReset();
    listPreferenceStoreMock.getHiddenColumns.mockReturnValue([]);
    listPreferenceStoreMock.getFilters.mockReturnValue(undefined);
    listPreferenceStoreMock.getSorting.mockReturnValue(null);
    listPreferenceStoreMock.getPerPage.mockReturnValue(null);
};

beforeEach(async () => {
    vue = await vi.importActual("vue");
    objectsGridProps = undefined;
    columnSlotProps = {};
    selectProps = undefined;
    route = reactive({ params: {}, query: {} });
    routerPush.mockReset();
    routerReplace.mockReset();
    routerPush.mockImplementation(({ query }) => {
        route.query = { ...(query || {}) };
        return Promise.resolve();
    });
    routerReplace.mockImplementation(({ query }) => {
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
            // Named to avoid colliding with the `status`/`filter` query keys other tests in this
            // file use incidentally (e.g. to prove sort/search sync preserves unrelated params).
            filterables: ["category", "id", "created"],
            filterableDetails: {
                category: { typeFilter: "ChoiceField", label: "Category" },
                // Server-hidden: an auto-injected deep-link filter with no editable widget.
                id: { typeFilter: "DecimalInField", hidden: true },
                created: { typeFilter: "DateRangeField", suffixes: ["after", "before"], label: "Created" },
            },
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

describe("lib/views/ViewList.vue", () => {
    describe("Lookup context", () => {
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
    });

    describe("List rendering and pagination", () => {
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

        scopedIt("reloads via the all-pages path when perPage is set to all", async () => {
            mockedInject.mockReturnValueOnce({});
            instanceList.state.paginateInfo.totalRecords = 5;
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            const pagination = wrapper.get('[data-qa="view-list-pagination"]');
            expect(pagination.attributes("per-page")).toBe("25");

            const initialClearListCalls = instanceList.clearList.mock.calls.length;
            const initialListCalls = instanceList.list.mock.calls.length;
            wrapper.findComponent(PaginationComponentStub).vm.$emit("update:perPage", "all");
            await vue.nextTick();

            expect(instanceList.clearList.mock.calls.length).toBe(initialClearListCalls + 1);
            expect(instanceList.list.mock.calls.length).toBe(initialListCalls + 1);
            wrapper.unmount();
        });

        scopedIt("sends the seeded page size as `ps` on the initial request", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            const listProps = mockedUseList.mock.calls.at(-1)[0].props;

            expect(listProps.params.ps).toBe(25);
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

        scopedIt("renders the pagination footer when records exist", async () => {
            mockedInject.mockReturnValueOnce({});
            instanceList.state.paginateInfo.totalRecords = 5;

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(wrapper.find('[data-qa="view-list-pagination"]').exists()).toBe(true);
            expect(wrapper.findComponent(PaginationComponentStub).exists()).toBe(true);

            wrapper.unmount();
        });

        scopedIt("passes total record count to pagination", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.showTotalRecordNum = true;
            instanceList.state.paginateInfo.totalRecords = 42;
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            const pagination = wrapper.get('[data-qa="view-list-pagination"]');
            expect(pagination.attributes("show-total-record-num")).toBe("true");
            expect(pagination.attributes("total-records")).toBe("42");
            wrapper.unmount();
        });
    });

    describe("Column preferences", () => {
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
            expect(listPreferenceStoreMock.setHiddenColumns).toHaveBeenCalledWith({ app: "app", model: "model" }, [
                "field1",
            ]);
            expect(hiddenPreference).toEqual(["field1"]);
            wrapper.unmount();
        });
    });

    describe("Filter preferences", () => {
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

        scopedIt("does not navigate when there are no stored filters", async () => {
            mockedInject.mockReturnValueOnce({});
            listPreferenceStoreMock.getFilters.mockReturnValue(undefined);

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            expect(routerPush).not.toHaveBeenCalled();
            wrapper.unmount();
        });
    });

    describe("Sorting and route synchronization", () => {
        scopedIt("restores stored filters and sorting together from an empty route", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.sortables = ["field1", "field2"];
            const storedSorting = ["field1", "field2"];
            listPreferenceStoreMock.getFilters.mockReturnValue({ status: "active" });
            listPreferenceStoreMock.getSorting.mockReturnValue(storedSorting);

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            expect(listPreferenceStoreMock.init).toHaveBeenCalledOnce();
            expect(listPreferenceStoreMock.getSorting).toHaveBeenCalledWith({ app: "app", model: "model" });
            expect(listPreferenceStoreMock.setSorting).not.toHaveBeenCalled();
            expect(routerReplace).toHaveBeenCalledWith({
                query: { status: "active", [ORDERING_PARAM]: "field1,field2" },
            });
            expect(route.query).toEqual({ status: "active", [ORDERING_PARAM]: "field1,field2" });
            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual(storedSorting);
            wrapper.unmount();
        });
        scopedIt("applies stored sorting to the sort control on mount", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.sortables = ["created_at", "name"];
            const storedSorting = ["-created_at"];
            listPreferenceStoreMock.getSorting.mockReturnValue(storedSorting);

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual(storedSorting);
            wrapper.unmount();
        });
        scopedIt("propagates sort control updates to preferences and params", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.sortables = ["name", "created_at"];
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });

            await vue.nextTick();

            wrapper.findComponent(SortControlStub).vm.$emit("update:sorted", ["-name", "created_at"]);
            await vue.nextTick();

            expect(listPreferenceStoreMock.setSorting).toHaveBeenCalledWith({ app: "app", model: "model" }, [
                "-name",
                "created_at",
            ]);
            expect(routerPush).toHaveBeenCalledWith({
                query: { [ORDERING_PARAM]: "-name,created_at" },
            });
            wrapper.unmount();
        });

        scopedIt("uses URL sorting instead of the stored preference", async () => {
            mockedInject.mockReturnValueOnce({});
            route.query = { [ORDERING_PARAM]: "-name,created_at", status: "active" };
            modelConfig.config.sortables = ["name", "created_at"];
            listPreferenceStoreMock.getSorting.mockReturnValue(["created_at"]);

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual(["-name", "created_at"]);
            expect(listPreferenceStoreMock.getSorting).not.toHaveBeenCalled();
            expect(listPreferenceStoreMock.setSorting).not.toHaveBeenCalled();
            wrapper.unmount();
        });

        scopedIt("does not add stored sorting to a non-empty URL without sorting", async () => {
            mockedInject.mockReturnValueOnce({});
            route.query = { status: "active" };
            modelConfig.config.sortables = ["name"];
            listPreferenceStoreMock.getSorting.mockReturnValue(["-name"]);

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual([]);
            expect(listPreferenceStoreMock.getSorting).not.toHaveBeenCalled();
            expect(routerReplace).not.toHaveBeenCalled();
            wrapper.unmount();
        });

        scopedIt("sanitizes and canonicalizes URL sorting", async () => {
            mockedInject.mockReturnValueOnce({});
            route.query = { [ORDERING_PARAM]: ["-name", "bogus,name,created_at"] };
            modelConfig.config.sortables = ["name", "created_at"];

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual(["-name", "created_at"]);
            expect(routerReplace).toHaveBeenCalledWith({
                query: { [ORDERING_PARAM]: "-name,created_at" },
            });
            wrapper.unmount();
        });

        scopedIt("clears URL sorting without overwriting the saved preference", async () => {
            mockedInject.mockReturnValueOnce({});
            route.query = { [ORDERING_PARAM]: "-name", status: "active" };
            modelConfig.config.sortables = ["name"];

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            route.query = { status: "active" };
            await vue.nextTick();

            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual([]);
            expect(listPreferenceStoreMock.setSorting).not.toHaveBeenCalled();
            wrapper.unmount();
        });

        scopedIt("applies the server default sort when there is no URL sort and no stored preference", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.sortables = ["name", "created_at"];
            modelConfig.config.sorted = ["-created_at"];
            listPreferenceStoreMock.getSorting.mockReturnValue(null);

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual(["-created_at"]);
            // The store is genuinely consulted and comes back empty (as opposed to the
            // lookup being skipped); the resulting default sort must still never be
            // written back as if it were the user's preference.
            expect(listPreferenceStoreMock.getSorting).toHaveBeenCalledWith({ app: "app", model: "model" });
            expect(listPreferenceStoreMock.setSorting).not.toHaveBeenCalled();
            wrapper.unmount();
        });

        scopedIt("applies the server default sort when the URL ordering param is explicitly empty", async () => {
            mockedInject.mockReturnValueOnce({});
            route.query = { [ORDERING_PARAM]: "" };
            modelConfig.config.sortables = ["name", "created_at"];
            modelConfig.config.sorted = ["-created_at"];

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual(["-created_at"]);
            // An empty `?o=` chooses nothing, so the default applies and the param is dropped
            // rather than filled in with it.
            expect(route.query[ORDERING_PARAM]).toBeUndefined();
            // `?o=` is a present-but-empty ordering param, not a stored-preference lookup.
            expect(listPreferenceStoreMock.getSorting).not.toHaveBeenCalled();
            expect(listPreferenceStoreMock.setSorting).not.toHaveBeenCalled();
            wrapper.unmount();
        });

        scopedIt("keeps the server default sort when an unrelated query parameter changes", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.sortables = ["name", "created_at"];
            modelConfig.config.sorted = ["-created_at"];
            listPreferenceStoreMock.getSorting.mockReturnValue(null);

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual(["-created_at"]);
            expect(route.query[ORDERING_PARAM]).toBeUndefined();

            // a filter push replaces route.query without an `o` key
            route.query = { status: "active" };
            await vue.nextTick();
            await vue.nextTick();

            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual(["-created_at"]);
            expect(route.query[ORDERING_PARAM]).toBeUndefined();
            expect(listPreferenceStoreMock.setSorting).not.toHaveBeenCalled();
            wrapper.unmount();
        });

        scopedIt("does not send an untouched server default as an ordering param", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.sortables = ["name", "created_at"];
            modelConfig.config.sorted = ["-created_at"];
            listPreferenceStoreMock.getSorting.mockReturnValue(null);

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            // The reader sees the default in the sort control, and the request leaves the
            // ordering param off, so the server applies the ordering it reported rather than
            // this reading that report back to it. The two are not always the same order: a
            // ranked search sorts by relevance while the param is absent, and a default
            // declared as `Lower("name")` sorts by the expression, not the bare column.
            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual(["-created_at"]);
            const listProps = mockedUseList.mock.calls.at(-1)[0].props;
            expect(listProps.params[ORDERING_PARAM]).toEqual([]);
            wrapper.unmount();
        });

        scopedIt("sends the ordering param once the reader chooses a sort", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.sortables = ["name", "created_at"];
            modelConfig.config.sorted = ["-created_at"];
            listPreferenceStoreMock.getSorting.mockReturnValue(null);

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();
            const listProps = mockedUseList.mock.calls.at(-1)[0].props;
            expect(listProps.params[ORDERING_PARAM]).toEqual([]);

            wrapper.findComponent(SortControlStub).vm.$emit("update:sorted", ["name"]);
            await vue.nextTick();

            expect(listProps.params[ORDERING_PARAM]).toEqual(["name"]);
            expect(routerPush).toHaveBeenCalledWith({ query: { [ORDERING_PARAM]: "name" } });
            wrapper.unmount();
        });

        scopedIt("stops sending the ordering param when the reader resets to the default", async () => {
            mockedInject.mockReturnValueOnce({});
            route.query = { [ORDERING_PARAM]: "name" };
            modelConfig.config.sortables = ["name", "created_at"];
            modelConfig.config.sorted = ["-created_at"];

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();
            const listProps = mockedUseList.mock.calls.at(-1)[0].props;
            expect(listProps.params[ORDERING_PARAM]).toEqual(["name"]);

            // Reset sort arrives as an empty sort, which resolves to the default: shown in the
            // control, absent from the request.
            wrapper.findComponent(SortControlStub).vm.$emit("update:sorted", []);
            await vue.nextTick();

            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual(["-created_at"]);
            expect(listProps.params[ORDERING_PARAM]).toEqual([]);
            expect(routerPush).toHaveBeenCalledWith({ query: {} });
            wrapper.unmount();
        });

        scopedIt("leaves a ranked search unordered so the server can rank it", async () => {
            mockedInject.mockReturnValueOnce({});
            route.query = { [SEARCH_PARAM]: "test" };
            modelConfig.config.sortables = ["name", "created_at"];
            modelConfig.config.sorted = ["name"];

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            // `VuedaSearchFilterBackend` keeps its `-combined_rank` ordering only while the
            // ordering param is absent, so sending the reported default here would replace
            // relevance order with an alphabetical one.
            const listProps = mockedUseList.mock.calls.at(-1)[0].props;
            expect(listProps.params[SEARCH_PARAM]).toBe("test");
            expect(listProps.params[ORDERING_PARAM]).toEqual([]);
            expect(route.query[ORDERING_PARAM]).toBeUndefined();
            wrapper.unmount();
        });

        scopedIt("prefers a stored sort preference over the server default", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.sortables = ["name", "created_at"];
            modelConfig.config.sorted = ["-created_at"];
            listPreferenceStoreMock.getSorting.mockReturnValue(["name"]);

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual(["name"]);
            wrapper.unmount();
        });

        scopedIt("prefers an explicit URL sort over the server default", async () => {
            mockedInject.mockReturnValueOnce({});
            route.query = { [ORDERING_PARAM]: "name" };
            modelConfig.config.sortables = ["name", "created_at"];
            modelConfig.config.sorted = ["-created_at"];

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual(["name"]);
            expect(listPreferenceStoreMock.getSorting).not.toHaveBeenCalled();
            wrapper.unmount();
        });
    });

    describe("Filter and search synchronization", () => {
        scopedIt("keeps filter parameters when clearing search input", async () => {
            mockedInject.mockReturnValueOnce({});
            route.query = { [SEARCH_PARAM]: "search-term", [ORDERING_PARAM]: "-name", filter: "status" };
            modelConfig.config.sortables = ["name"];
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
            expect(routerPush).toHaveBeenCalledWith({
                query: { [ORDERING_PARAM]: "-name", filter: "status" },
            });
            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual(["-name"]);
            wrapper.unmount();
        });

        scopedIt("preserves URL sorting when filters change without storing it as a filter", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { [ORDERING_PARAM]: "-name", status: "old" };
            modelConfig.config.sortables = ["name"];
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            wrapper.vm.filter.state.addedFilters.push({ field: "status", param: "status", value: "active" });
            await vue.nextTick();

            expect(listPreferenceStoreMock.setFilters).toHaveBeenCalledWith(
                { app: "app", model: "model" },
                { status: "active" },
            );
            expect(routerPush).toHaveBeenCalledWith({
                query: { [ORDERING_PARAM]: "-name", status: "active" },
            });
            wrapper.unmount();
        });
    });

    describe("Rich filter state and restoration", () => {
        scopedIt("resolves filterables/filterableDetails/validFilterables and passes them to FilterGroup", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            const filterGroupProps = wrapper.findComponent(FilterGroupStub).props();
            expect(filterGroupProps.filterables).toEqual(["category", "id", "created"]);
            expect(filterGroupProps.filterableDetails).toEqual(modelConfig.config.filterableDetails);
            // The hidden `id` filter is excluded from the presentable/valid list.
            expect(filterGroupProps.validFilterables).toEqual(["category", "created"]);
            wrapper.unmount();
        });

        scopedIt("restores an active filter from the URL query on load", async () => {
            mockedInject.mockReturnValueOnce({});
            route.query = { category: "widgets" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(wrapper.vm.filter.state.addedFilters).toHaveLength(1);
            expect(wrapper.vm.filter.state.addedFilters[0]).toMatchObject({
                field: "category",
                param: "category",
                value: "widgets",
                range: false,
            });
            wrapper.unmount();
        });

        scopedIt("restores a range filter's suffixed query params as one filter entry", async () => {
            mockedInject.mockReturnValueOnce({});
            route.query = { created_after: "2024-01-01", created_before: "2024-02-01" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(wrapper.vm.filter.state.addedFilters).toHaveLength(1);
            expect(wrapper.vm.filter.state.addedFilters[0]).toMatchObject({
                field: "created",
                param: ["created_after", "created_before"],
                value: { after: "2024-01-01", before: "2024-02-01" },
                range: true,
            });
            wrapper.unmount();
        });

        scopedIt("does not restore a server-hidden filter from the URL", async () => {
            mockedInject.mockReturnValueOnce({});
            route.query = { id: "1,2" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(wrapper.vm.filter.state.addedFilters).toEqual([]);
            wrapper.unmount();
        });

        scopedIt("re-restores when the route query changes externally (e.g. browser navigation)", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            expect(wrapper.vm.filter.state.addedFilters).toEqual([]);

            route.query = { category: "archived" };
            await vue.nextTick();

            expect(wrapper.vm.filter.state.addedFilters).toHaveLength(1);
            expect(wrapper.vm.filter.state.addedFilters[0]).toMatchObject({ field: "category", value: "archived" });
            wrapper.unmount();
        });

        scopedIt("resets to the first page when the active filters change", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            wrapper.vm.list.listState.currentPage = 3;
            await vue.nextTick();

            wrapper.vm.filter.state.addedFilters.push({ field: "category", param: "category", value: "widgets" });
            await vue.nextTick();

            expect(wrapper.vm.list.listState.currentPage).toBe(1);
            wrapper.unmount();
        });

        scopedIt("clears filter params from the route and request params once removed", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { category: "widgets" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            expect(wrapper.vm.list.listState.params.category).toBe("widgets");

            routerPush.mockClear();
            listPreferenceStoreMock.setFilters.mockClear();
            wrapper.vm.filter.state.addedFilters.splice(0, wrapper.vm.filter.state.addedFilters.length);
            await vue.nextTick();

            expect(wrapper.vm.list.listState.params.category).toBeUndefined();
            expect(routerPush).toHaveBeenCalledWith({ query: {} });
            expect(listPreferenceStoreMock.setFilters).toHaveBeenCalledWith({ app: "app", model: "model" }, {});
            wrapper.unmount();
        });

        scopedIt("keeps a rich choice value in memory once the route round-trips its serialized form", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            const richFilter = {
                field: "category",
                param: "category",
                value: { value: "widgets", label: "Widgets" },
                isValueRawObject: true,
            };
            wrapper.vm.filter.state.addedFilters.push(richFilter);
            await vue.nextTick();

            // The raw value serialized into the URL...
            expect(routerPush).toHaveBeenCalledWith({ query: { category: "widgets" } });
            // ...but restoring from that round-tripped route.query does not flatten the richer
            // in-memory filter: the {value, label} object and isValueRawObject flag survive,
            // because the restore guard compares serialized forms rather than overwriting on any
            // route.query change.
            expect(wrapper.vm.filter.state.addedFilters).toHaveLength(1);
            expect(wrapper.vm.filter.state.addedFilters[0]).toEqual(richFilter);
            wrapper.unmount();
        });

        scopedIt("does not push filter changes while navigated away from the list action", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "detail" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            wrapper.vm.filter.state.addedFilters.push({ field: "category", param: "category", value: "widgets" });
            await vue.nextTick();

            expect(routerPush).not.toHaveBeenCalled();
            wrapper.unmount();
        });

        scopedIt("emits filtered once on mount as a live ref reflecting later addedFilters changes", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(wrapper.emitted("filtered")).toHaveLength(1);
            const filtered = wrapper.emitted("filtered")[0][0];
            expect(filtered.value).toEqual([]);

            wrapper.vm.filter.state.addedFilters.push({ field: "category", param: "category", value: "widgets" });
            await vue.nextTick();

            // Same emission, live ref now reflects the change -- not a second emit.
            expect(wrapper.emitted("filtered")).toHaveLength(1);
            expect(filtered.value).toEqual([{ field: "category", param: "category", value: "widgets" }]);
            wrapper.unmount();
        });

        scopedIt("emits query-change once on mount as a live ref reflecting later route changes", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(wrapper.emitted("query-change")).toHaveLength(1);
            const queryChange = wrapper.emitted("query-change")[0][0];
            expect(queryChange.value).toEqual({});

            route.query = { category: "widgets" };
            await vue.nextTick();

            // Same emission, live ref now reflects the change -- not a second emit.
            expect(wrapper.emitted("query-change")).toHaveLength(1);
            expect(queryChange.value).toEqual({ category: "widgets" });
            wrapper.unmount();
        });
    });

    describe("Sort controls", () => {
        scopedIt("renders the sort control when sortables become available", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewList, {
                props: {
                    app: "app",
                    model: "model",
                },
            });

            expect(wrapper.find('[data-qa="sort-control"]').exists()).toBe(false);

            modelConfig.config.sortables = ["name"];
            await vue.nextTick();

            expect(wrapper.find('[data-qa="sort-control"]').exists()).toBe(true);
            wrapper.unmount();
        });

        scopedIt("removes sorting from the URL when the sort is cleared to empty", async () => {
            mockedInject.mockReturnValueOnce({});
            route.query = { [ORDERING_PARAM]: "-name", status: "active" };
            modelConfig.config.sortables = ["name"];
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            wrapper.findComponent(SortControlStub).vm.$emit("update:sorted", []);
            await vue.nextTick();

            expect(listPreferenceStoreMock.clearSorting).toHaveBeenCalledWith({ app: "app", model: "model" });
            expect(listPreferenceStoreMock.setSorting).not.toHaveBeenCalled();
            expect(routerPush).toHaveBeenCalledWith({ query: { status: "active" } });
            wrapper.unmount();
        });

        scopedIt("renders the sort control whenever sortables exist, regardless of layout", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.sortables = ["name"];
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            // Present in the default table layout, no isTable toggle required.
            expect(wrapper.find('[data-qa="sort-control"]').exists()).toBe(true);
            modelConfig.config.sortables = [];
            await vue.nextTick();

            expect(wrapper.find('[data-qa="sort-control"]').exists()).toBe(false);
            wrapper.unmount();
        });

        scopedIt(
            "shows Reset sort only when the active sort differs from the server default, and restores it on click",
            async () => {
                mockedInject.mockReturnValueOnce({});
                modelConfig.config.sortables = ["name", "created_at"];
                modelConfig.config.sorted = ["-created_at"];
                route.query = { [ORDERING_PARAM]: "name" };

                const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
                await vue.nextTick();
                await vue.nextTick();

                expect(wrapper.find('[data-qa="sort-reset"]').exists()).toBe(true);

                await wrapper.get('[data-qa="sort-reset"]').trigger("click");
                await vue.nextTick();

                expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual(["-created_at"]);
                expect(wrapper.find('[data-qa="sort-reset"]').exists()).toBe(false);
                wrapper.unmount();
            },
        );

        scopedIt("does not persist a preference when Reset sort is clicked", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.sortables = ["name", "created_at"];
            modelConfig.config.sorted = ["-created_at"];
            route.query = { [ORDERING_PARAM]: "name" };

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            await wrapper.get('[data-qa="sort-reset"]').trigger("click");
            await vue.nextTick();

            // Reset clears any stored preference rather than pinning today's default as
            // an explicit one, so a later server default change is still followed on the
            // next visit instead of being stuck on whatever the default was at reset time.
            expect(listPreferenceStoreMock.clearSorting).toHaveBeenCalledWith({ app: "app", model: "model" });
            expect(listPreferenceStoreMock.setSorting).not.toHaveBeenCalled();
            wrapper.unmount();
        });

        scopedIt("hides a sort chip's remove control once removing it would leave nothing sorted", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.sortables = ["name", "created_at"];
            route.query = { [ORDERING_PARAM]: "name,created_at" };

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            expect(wrapper.findAll('[data-qa="sort-chip-remove"]')).toHaveLength(2);

            await wrapper.findAll('[data-qa="sort-chip-remove"]')[0].trigger("click");
            await vue.nextTick();
            await vue.nextTick();

            expect(wrapper.findAll('[data-qa="sort-chip"]')).toHaveLength(1);
            expect(wrapper.find('[data-qa="sort-chip-remove"]').exists()).toBe(false);
            wrapper.unmount();
        });
    });

    describe("Constraints band", () => {
        scopedIt("keeps the sticky constraints band collapsed with no active constraint", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.sortables = ["name"];
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(wrapper.find('[data-qa="view-list-constraints-toggle"]').exists()).toBe(false);
            expect(wrapper.get('[data-qa="constraints-bar"]').attributes("data-open")).toBe("false");
            const constraintsChrome = wrapper
                .findAll('[data-qa="sticky-chrome"][data-zone="top"][data-reveal="scroll-up"]')
                .find((chrome) => chrome.find('[data-qa="constraints-bar"]').exists());
            expect(constraintsChrome).toBeTruthy();
            wrapper.unmount();
        });

        scopedIt("opens the sticky constraints band once a sort is active", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.sortables = ["name"];
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            wrapper.findComponent(SortControlStub).vm.$emit("update:sorted", ["-name"]);
            await vue.nextTick();

            expect(wrapper.find('[data-qa="view-list-constraints-toggle"]').exists()).toBe(false);
            expect(wrapper.get('[data-qa="constraints-bar"]').attributes("data-open")).toBe("true");
            wrapper.unmount();
        });
    });

    describe("Type-aware column adapters", () => {
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

    describe("Bulk selection read-out", () => {
        // A bulk action makes the `selected_` checkbox column render; toggling that checkbox
        // drives actions.selectedObjects, which the bulk-actions strip and its count read.
        const configureBulkAction = () => {
            modelConfig.config.actionDetails = { delete: { bulk: true } };
            mockedUseFilteredActions.mockReturnValue(vue.reactive({ actions: ["delete"] }));
        };

        scopedIt("omits the selection strip when nothing is selected", async () => {
            mockedInject.mockReturnValueOnce({});
            configureBulkAction();
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            expect(wrapper.find('[data-qa="view-list-bulk-actions"]').exists()).toBe(false);
            expect(wrapper.find('[data-qa="view-list-selection-count"]').exists()).toBe(false);
            wrapper.unmount();
        });

        scopedIt("shows the selected-row count once a row is selected", async () => {
            mockedInject.mockReturnValueOnce({});
            configureBulkAction();
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await wrapper.find('[data-qa="checkbox"]').trigger("change");
            await vue.nextTick();
            const readout = wrapper.find('[data-qa="view-list-selection-count"]');
            expect(readout.exists()).toBe(true);
            expect(readout.text()).toContain("1 selected");
            wrapper.unmount();
        });
    });
});
