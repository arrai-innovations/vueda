import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { COLUMN_TOTALS_PARAM, FIELDS_PARAM, ORDERING_PARAM, PAGE_PARAM, SEARCH_PARAM } from "@vueda/utils/constants.js";
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
    props: ["fields", "cardFieldClasses", "cardHeaderClasses"],
    emits: ["update:isTable"],
    setup(props, { slots, attrs }) {
        objectsGridProps = props;
        return () =>
            h("div", { "data-qa": "objects-grid", ...attrs }, [
                slots.default ? slots.default() : null,
                // Render each field's `header(<col>)` slot as a card-layout label, the way
                // ObjectsGridCardCell does, so header defaults are exercised.
                ...(props.fields || []).map((field) => {
                    const slot = slots[`header(${field.name})`];
                    if (!slot) {
                        return null;
                    }
                    return h(
                        "div",
                        { "data-header-column": field.name },
                        slot({ field, class: "", isCardLayout: true, isTableLayout: false }),
                    );
                }),
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
                // Mirror the real grid's totals slot, so the footer row ViewList injects into it is
                // actually rendered rather than silently dropped.
                slots["row-after-objects"] ? slots["row-after-objects"]({ class: "body-row" }) : null,
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

enableAutoUnmount(afterEach);

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
            displayFields: ["field.name"],
            fieldDetails: { "field.name": {} },
            verboseNamePlural: "items",
            actionDetails: {},
            fetchFields: [],
            sortables: [],
            // Named to avoid colliding with the `status`/`filter` query keys other tests in this
            // file use incidentally (e.g. to prove sort/search sync preserves unrelated params).
            filterables: ["category", "id", "created"],
            filterableDetails: {
                category: { typeFilter: "ChoiceField", label: "Category" },
                // Server-hidden: an auto-injected deep-link filter whose type has neither a value
                // mapping nor an input component. Its URL value travels without an editable widget.
                id: { typeFilter: "UUIDField", hidden: true },
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
    scopedIt("resets model state and restores destination preferences on a reused list", async () => {
        route.params = { app: "catalog", model: "category", action: "list" };
        modelConfig.config.displayFields = ["name", "description"];
        modelConfig.config.sortables = ["name"];
        const wrapper = mount(ViewList, { props: { app: "catalog", model: "category" } });
        await vue.nextTick();
        wrapper.vm.actions.selectedObjects.push(4);
        wrapper.vm.sort.sorting.updateSorted(["name"]);
        await vue.nextTick();
        listPreferenceStoreMock.getPerPage.mockImplementation(({ model }) => (model === "warehouse" ? 50 : 25));
        listPreferenceStoreMock.getHiddenColumns.mockImplementation(({ model }) =>
            model === "warehouse" ? ["name"] : [],
        );
        listPreferenceStoreMock.getSorting.mockImplementation(({ model }) =>
            model === "warehouse" ? ["-code"] : null,
        );
        listPreferenceStoreMock.getFilters.mockImplementation(({ model }) =>
            model === "warehouse" ? { category: "stored" } : undefined,
        );
        const uid = wrapper.vm.$.uid;
        route.params.model = "warehouse";
        route.query = {};
        await vue.nextTick();
        modelConfig.loading = true;
        await wrapper.setProps({ model: "warehouse" });
        modelConfig.config.displayFields = ["name", "code"];
        modelConfig.config.sortables = ["code"];
        modelConfig.loading = false;
        await vue.nextTick();
        await vue.nextTick();
        expect(wrapper.vm.$.uid).toBe(uid);
        expect(wrapper.vm.actions.selectedObjects).toEqual([]);
        expect(wrapper.vm.list.listState.perPage).toBe(50);
        expect(wrapper.vm.columns.columns).toEqual(["code"]);
        expect(wrapper.vm.sort.sorting.state.sorted).toEqual(["-code"]);
        expect(wrapper.vm.list.listState.params).toMatchObject({ ps: 50, category: "stored" });
        expect(route.query).toMatchObject({ category: "stored", [ORDERING_PARAM]: "-code" });
    });

    scopedIt("does not rewrite a destination query while the old model props are retained", async () => {
        route.params = { app: "catalog", model: "category", action: "list" };
        modelConfig.config.sortables = ["name"];
        const wrapper = mount(ViewList, { props: { app: "catalog", model: "category" } });
        await vue.nextTick();
        routerPush.mockClear();
        routerReplace.mockClear();
        listPreferenceStoreMock.setFilters.mockClear();
        route.params.model = "warehouse";
        route.query = { [ORDERING_PARAM]: "-code", [SEARCH_PARAM]: "destination", category: "new" };
        await vue.nextTick();
        expect(routerPush).not.toHaveBeenCalled();
        expect(routerReplace).not.toHaveBeenCalled();
        expect(listPreferenceStoreMock.setFilters).not.toHaveBeenCalled();
        modelConfig.loading = true;
        await wrapper.setProps({ model: "warehouse" });
        modelConfig.config.sortables = ["code"];
        modelConfig.loading = false;
        await vue.nextTick();
        await vue.nextTick();
        expect(route.query).toEqual({ [ORDERING_PARAM]: "-code", [SEARCH_PARAM]: "destination", category: "new" });
        expect(wrapper.vm.list.listState.search).toBe("destination");
        expect(wrapper.vm.list.listState.params).toMatchObject({ category: "new", [SEARCH_PARAM]: "destination" });
    });

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
        scopedIt("passes extra and display field objects through to ObjectsGrid unchanged", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewList, {
                props: {
                    app: "a",
                    model: "b",
                    extraFieldObjects: [{ name: "foo.bar", label: "Foo" }],
                },
            });
            await vue.nextTick();
            const fields = objectsGridProps.fields;
            // A field's dotted `name` already is the path `unifiedGet` reads a row's value from, so
            // no `value` is derived or injected here.
            expect(fields[0]).toEqual({ name: "foo.bar", label: "Foo" });
            expect(fields[1]).toEqual({ name: "field.name" });
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

        scopedIt("lets the prop turn the record count on over the model config", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.showTotalRecordNum = false;
            instanceList.state.paginateInfo.totalRecords = 7;
            const wrapper = mount(ViewList, {
                props: { app: "app", model: "model", showTotalRecordNum: true },
            });
            await vue.nextTick();
            expect(wrapper.get('[data-qa="view-list-pagination"]').attributes("show-total-record-num")).toBe("true");
            wrapper.unmount();
        });

        scopedIt("falls back to the model config when the record count prop is unset", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.showTotalRecordNum = false;
            instanceList.state.paginateInfo.totalRecords = 7;
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            expect(wrapper.get('[data-qa="view-list-pagination"]').attributes("show-total-record-num")).toBe("false");
            wrapper.unmount();
        });
    });

    describe("Column preferences", () => {
        scopedIt("lets the prop turn the column selector off over the model config", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.allowColumnHiding = true;
            const wrapper = mount(ViewList, {
                props: { app: "app", model: "model", allowColumnHiding: false },
            });
            await vue.nextTick();
            await vue.nextTick();
            expect(wrapper.find('[data-qa="select"]').exists()).toBe(false);
            wrapper.unmount();
        });

        scopedIt("renders column selector when the prop allows hiding and the model config does not", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.allowColumnHiding = false;
            const wrapper = mount(ViewList, {
                props: { app: "app", model: "model", allowColumnHiding: true },
            });
            await vue.nextTick();
            await vue.nextTick();
            expect(wrapper.find('[data-qa="select"]').exists()).toBe(true);
            wrapper.unmount();
        });

        scopedIt("renders column selector when column hiding allowed", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.allowColumnHiding = true;
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();
            expect(wrapper.find('[data-qa="select"]').exists()).toBe(true);
            expect(selectProps.modelValue).toEqual(["field.name"]);
            expect(selectProps.multiple).toBe(true);
            wrapper.unmount();
        });

        scopedIt("initializes columns using stored hidden preferences", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.allowColumnHiding = true;
            modelConfig.config.displayFields = ["field.name", "other_field"];
            modelConfig.config.fieldDetails.other_field = {};
            listPreferenceStoreMock.getHiddenColumns.mockReturnValue(["other_field"]);

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            expect(listPreferenceStoreMock.getHiddenColumns).toHaveBeenCalledWith({ app: "app", model: "model" });
            expect(selectProps.modelValue).toEqual(["field.name"]);
            wrapper.unmount();
        });

        scopedIt("persists hidden column selections to the preference store", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.allowColumnHiding = true;
            modelConfig.config.displayFields = ["field.name", "other_field"];
            modelConfig.config.fieldDetails.other_field = {};

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            listPreferenceStoreMock.setHiddenColumns.mockClear();
            wrapper.findComponent(SelectStub).vm.$emit("update:modelValue", ["other_field"]);
            await vue.nextTick();

            expect(listPreferenceStoreMock.setHiddenColumns).toHaveBeenCalledWith({ app: "app", model: "model" }, [
                "field.name",
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

    describe("Column totals", () => {
        const withTotals = ({ totalables, displayFields = ["field__name"] }) => {
            modelConfig.config.allowColumnHiding = true;
            modelConfig.config.displayFields = displayFields;
            modelConfig.config.fieldDetails = Object.fromEntries(displayFields.map((name) => [name, {}]));
            modelConfig.config.totalables = totalables;
        };

        // Totals are a table-footer feature, so these mount at the one breakpoint that is always
        // table. jsdom reports no media query as matching, which makes the default `lg` breakpoint
        // seed card layout, where nothing asks for a total at all — the subject of its own test
        // below rather than the starting state for the rest of them.
        const mountInTableLayout = () =>
            mount(ViewList, { props: { app: "app", model: "model", tableBreakpoint: "xs" } });

        scopedIt("asks for nothing when the server advertises no totals", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mountInTableLayout();
            await vue.nextTick();
            await vue.nextTick();

            expect(wrapper.vm.list.listState.params).not.toHaveProperty("ct");
            wrapper.unmount();
        });

        scopedIt("asks under COLUMN_TOTALS_PARAM", async () => {
            // The parameter is a client constant, like every other query parameter this view sends.
            // It has to match the server's `COLUMN_TOTALS_PARAM` setting, which the server does not
            // report; parameter-name discovery lands after v3.0.0.
            mockedInject.mockReturnValueOnce({});
            withTotals({ totalables: ["field__name"] });
            const wrapper = mountInTableLayout();
            await vue.nextTick();
            await vue.nextTick();

            expect(wrapper.vm.list.listState.params[COLUMN_TOTALS_PARAM]).toEqual(["field__name"]);
            expect(COLUMN_TOTALS_PARAM).toBe("ct");
            wrapper.unmount();
        });

        scopedIt("has the totals parameter in place before the first list request", async () => {
            // The totals are known from the display columns and the reader's stored hidden-column
            // preference, both of which are available as soon as the model config is. So the
            // parameter is written while the view is being set up, not a tick later: a tick later is
            // after the first list request has already gone out, and the list would fetch a second
            // time to add a parameter it could have carried the first time.
            mockedInject.mockReturnValueOnce({});
            withTotals({ totalables: ["field__name"] });

            const wrapper = mountInTableLayout();

            expect(wrapper.vm.list.listState.params[COLUMN_TOTALS_PARAM]).toEqual(["field__name"]);
            wrapper.unmount();
        });

        scopedIt("asks only for the totals its visible columns can render", async () => {
            // A total for a column the reader cannot see is a `SUM` computed for no one, so hiding
            // a totalled column stops asking for its total until the column comes back.
            mockedInject.mockReturnValueOnce({});
            withTotals({
                totalables: ["field__name"],
                displayFields: ["field__name", "other_field"],
            });
            const wrapper = mountInTableLayout();
            await vue.nextTick();
            await vue.nextTick();
            expect(wrapper.vm.list.listState.params.ct).toEqual(["field__name"]);

            wrapper.findComponent(SelectStub).vm.$emit("update:modelValue", ["other_field"]);
            await vue.nextTick();
            expect(wrapper.vm.list.listState.params).not.toHaveProperty("ct");

            wrapper.findComponent(SelectStub).vm.$emit("update:modelValue", ["field__name", "other_field"]);
            await vue.nextTick();
            expect(wrapper.vm.list.listState.params.ct).toEqual(["field__name"]);
            wrapper.unmount();
        });

        scopedIt("never asks in card layout, not even on the first request", async () => {
            // `isTable` is seeded from the breakpoint rather than assumed true, so a phone-width
            // load never puts the parameter in `listState.params` at all. Seeding it true meant the
            // first request carried the parameter, the grid then reported card layout, the
            // parameter was removed, and changing `listState.params` fetched the list a second
            // time — a wasted round trip and a wasted aggregation per total.
            mockedInject.mockReturnValueOnce({});
            withTotals({ totalables: ["field__name"] });

            // No `tableBreakpoint` override: jsdom matches no media query, so the default is card.
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });

            expect(wrapper.vm.list.listState.params).not.toHaveProperty("ct");
            await vue.nextTick();
            await vue.nextTick();
            expect(wrapper.vm.list.listState.params).not.toHaveProperty("ct");
            wrapper.unmount();
        });

        scopedIt("asks for nothing in card layout, and asks again on the way back", async () => {
            // The totals row is a table footer. Below the grid's table breakpoint there is nowhere
            // to render one, so a phone-width list should not be paying for the aggregation.
            mockedInject.mockReturnValueOnce({});
            withTotals({ totalables: ["field__name"] });
            const wrapper = mountInTableLayout();
            await vue.nextTick();
            await vue.nextTick();
            expect(wrapper.vm.list.listState.params.ct).toEqual(["field__name"]);

            wrapper.findComponent(ObjectsGridStub).vm.$emit("update:isTable", false);
            await vue.nextTick();
            expect(wrapper.vm.list.listState.params).not.toHaveProperty("ct");

            wrapper.findComponent(ObjectsGridStub).vm.$emit("update:isTable", true);
            await vue.nextTick();
            expect(wrapper.vm.list.listState.params.ct).toEqual(["field__name"]);
            wrapper.unmount();
        });

        scopedIt("reports an advertised total that matches no display column", async () => {
            // `vueda_info.E011` validates the ORM path behind a total but cannot know what the
            // client calls its columns, so a total keyed `prcie` passes every server-side rule and
            // still renders nowhere. Nothing fails for it -- it is simply never requested -- which
            // is why it is worth saying out loud here.
            const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
            mockedInject.mockReturnValueOnce({});
            withTotals({ totalables: ["field__name", "prcie"] });
            const wrapper = mountInTableLayout();
            await vue.nextTick();
            await vue.nextTick();

            expect(wrapper.vm.list.listState.params.ct).toEqual(["field__name"]);
            expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("prcie"));
            consoleError.mockRestore();
            wrapper.unmount();
        });

        scopedIt("renders the footer row keyed by display column name", async () => {
            mockedInject.mockReturnValueOnce({});
            withTotals({ totalables: ["field__name"] });
            instanceList.state.columnTotals = { field__name: "42.50" };
            const wrapper = mountInTableLayout();
            await vue.nextTick();
            await vue.nextTick();

            const totalsRow = wrapper.find('[role="row"]');
            expect(totalsRow.exists()).toBe(true);
            expect(totalsRow.text()).toContain("42.50");
            wrapper.unmount();
        });

        scopedIt("renders no footer row when no totals came back", async () => {
            mockedInject.mockReturnValueOnce({});
            withTotals({ totalables: ["field__name"] });
            const wrapper = mountInTableLayout();
            await vue.nextTick();
            await vue.nextTick();

            expect(wrapper.find('[role="row"]').exists()).toBe(false);
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

        scopedIt("does not save a hidden filterable's value to the preference while metadata is loading", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "1,2" };
            modelConfig.loading = true;
            modelConfig.config.filterables = [];
            modelConfig.config.filterableDetails = {};
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            const input = wrapper.findComponent(InputGroupInputStub);
            input.vm.$emit("update:model-value", "term");
            await vue.nextTick();
            input.vm.$emit("search");
            await vue.nextTick();

            expect(listPreferenceStoreMock.setFilters).not.toHaveBeenCalled();
            wrapper.unmount();
        });

        scopedIt("does not restore a stored hidden filterable's value to the request", async () => {
            mockedInject.mockReturnValueOnce({});
            listPreferenceStoreMock.getFilters.mockReturnValue({ id: "1,2", category: "widgets" });
            route.params = { action: "list" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();
            await vue.nextTick();

            expect(wrapper.vm.list.listState.params.id).toBeUndefined();
            expect(wrapper.vm.filter.state.addedFilters).toEqual([
                expect.objectContaining({ field: "category", value: "widgets" }),
            ]);
            expect(routerPush).toHaveBeenCalledWith({ query: { category: "widgets" } });
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
        scopedIt("excludes a hidden filterable's stored key when a stored sort canonicalizes the route", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.sortables = ["field1"];
            listPreferenceStoreMock.getFilters.mockReturnValue({ id: "1,2", category: "widgets" });
            listPreferenceStoreMock.getSorting.mockReturnValue(["field1"]);

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();
            await vue.nextTick();

            expect(routerReplace).toHaveBeenCalledWith({
                query: { category: "widgets", [ORDERING_PARAM]: "field1" },
            });
            expect(route.query).toEqual({ category: "widgets", [ORDERING_PARAM]: "field1" });
            expect(wrapper.vm.list.listState.params.id).toBeUndefined();
            expect(wrapper.vm.filter.state.addedFilters).toEqual([
                expect.objectContaining({ field: "category", value: "widgets" }),
            ]);
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

        scopedIt("restores a dotted related-field sort from the URL", async () => {
            mockedInject.mockReturnValueOnce({});
            route.query = { [ORDERING_PARAM]: "-customer.name,created_at" };
            modelConfig.config.sortables = ["customer.name", "created_at"];

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            await vue.nextTick();

            // The dot in `customer.name` is a literal character in a single sort term here, not a
            // separator: only the comma between terms and the leading `-` for direction are meaningful.
            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual(["-customer.name", "created_at"]);
            expect(listPreferenceStoreMock.getSorting).not.toHaveBeenCalled();
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

        scopedIt("omits a visible filter whose type has no value handling and warns once per visit", async () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            modelConfig.config.filterables = ["category", "token"];
            modelConfig.config.filterableDetails = {
                category: { typeFilter: "ChoiceField", label: "Category" },
                token: { typeFilter: "UUIDField", label: "Token" },
            };
            route.query = { token: "abc" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(wrapper.findComponent(FilterGroupStub).props().validFilterables).toEqual(["category"]);
            // The URL value is neither presented as an applied filter nor sent with the request.
            expect(wrapper.vm.filter.state.addedFilters).toEqual([]);
            expect(wrapper.vm.list.listState.params.token).toBeUndefined();
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0][0]).toContain('Filter "token" on app.model');
            expect(warn.mock.calls[0][0]).toContain('value handling for filter type "UUIDField"');

            // A later metadata change recomputes the offered list without repeating the warning.
            modelConfig.config.filterableDetails.token.label = "Access token";
            await vue.nextTick();
            expect(warn).toHaveBeenCalledTimes(1);

            warn.mockRestore();
            wrapper.unmount();
        });

        scopedIt(
            "warns for an unsupported filter on the next model when its metadata lands before the reset",
            async () => {
                const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
                mockedInject.mockReturnValueOnce({});
                route.params = { app: "app", model: "model", action: "list" };
                modelConfig.config.filterables = ["token"];
                modelConfig.config.filterableDetails = { token: { typeFilter: "UUIDField", label: "Token" } };
                const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
                await vue.nextTick();
                expect(warn).toHaveBeenCalledTimes(1);
                expect(warn.mock.calls[0][0]).toContain('Filter "token" on app.model');

                // The next model reports a filter with the same name. Its metadata is written before the
                // model prop changes, so the unsupported-filter check reruns before the target reset does.
                route.params.model = "warehouse";
                modelConfig.config.filterableDetails = { token: { typeFilter: "UUIDField", label: "Token" } };
                await wrapper.setProps({ model: "warehouse" });
                await vue.nextTick();

                expect(warn).toHaveBeenCalledTimes(2);
                expect(warn.mock.calls[1][0]).toContain('Filter "token" on app.warehouse');

                warn.mockRestore();
                wrapper.unmount();
            },
        );

        scopedIt("omits a visible filter whose type has value handling but no input component", async () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.filterables = ["category", "published"];
            modelConfig.config.filterableDetails = {
                category: { typeFilter: "ChoiceField", label: "Category" },
                published: { typeFilter: "DateField", label: "Published" },
            };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(wrapper.findComponent(FilterGroupStub).props().validFilterables).toEqual(["category"]);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0][0]).toContain('Filter "published" on app.model');
            expect(warn.mock.calls[0][0]).toContain('a field component for filter type "DateField"');
            expect(warn.mock.calls[0][0]).toContain('a widget for filter type "DateField"');

            warn.mockRestore();
            wrapper.unmount();
        });

        scopedIt("offers a visible filter whose view config overrides supply the input components", async () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.filterables = ["published"];
            modelConfig.config.filterableDetails = { published: { typeFilter: "DateField", label: "Published" } };
            modelConfig.config.fieldComponents = { published: "FormField" };
            modelConfig.config.widgetComponents = { published: "WidgetDateField" };
            route.query = { published: "2024-01-01" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(wrapper.findComponent(FilterGroupStub).props().validFilterables).toEqual(["published"]);
            expect(wrapper.vm.filter.state.addedFilters[0]).toMatchObject({ field: "published", value: "2024-01-01" });
            expect(warn).not.toHaveBeenCalled();

            warn.mockRestore();
            wrapper.unmount();
        });

        scopedIt.each([
            [
                "a function-wrapped widget that returns nothing",
                { name: () => undefined },
                'a widget for filter type "CharField"',
            ],
            ["the WidgetUnmapped diagnostic", { name: "WidgetUnmapped" }, 'a widget for filter type "CharField"'],
            [
                "a range boundary resolved to the WidgetUnmapped diagnostic",
                { "created.before": "WidgetUnmapped" },
                'a widget for the "before" boundary of filter type "DateRangeField"',
            ],
        ])("omits a visible filter whose override resolves %s and warns", async (_, widgetComponents, missing) => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.filterables = ["category", "name", "created"];
            modelConfig.config.filterableDetails = {
                category: { typeFilter: "ChoiceField", label: "Category" },
                name: { typeFilter: "CharField", label: "Name" },
                created: { typeFilter: "DateRangeField", suffixes: ["after", "before"], label: "Created" },
            };
            modelConfig.config.widgetComponents = widgetComponents;
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            const offered = wrapper.findComponent(FilterGroupStub).props().validFilterables;
            const [omitted] = Object.keys(widgetComponents)[0].split(".");
            expect(offered).not.toContain(omitted);
            expect(offered).toContain("category");
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0][0]).toContain(`Filter "${omitted}" on app.model`);
            expect(warn.mock.calls[0][0]).toContain(missing);

            warn.mockRestore();
            wrapper.unmount();
        });

        scopedIt("offers a custom filter type registered with both value handling and components", async () => {
            const { mergeFilterFieldMapping, filterFieldMapping, FilterFieldMappings } =
                await import("@vueda/utils/fieldMappings.js");
            mergeFilterFieldMapping({
                ColorField: { component: "FormField", widget: "WidgetTextInput", initialValue: "" },
            });
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.filterables = ["color"];
            modelConfig.config.filterableDetails = { color: { typeFilter: "ColorField", label: "Color" } };
            route.query = { color: "teal" };
            try {
                const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
                await vue.nextTick();

                expect(wrapper.findComponent(FilterGroupStub).props().validFilterables).toEqual(["color"]);
                expect(wrapper.vm.filter.state.addedFilters[0]).toMatchObject({ field: "color", value: "teal" });
                expect(warn).not.toHaveBeenCalled();
                wrapper.unmount();
            } finally {
                warn.mockRestore();
                delete filterFieldMapping.ColorField;
                delete FilterFieldMappings.ColorField;
            }
        });

        scopedIt("carries a hidden filter with an unmapped type to the request without offering it", async () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "1,2" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(wrapper.findComponent(FilterGroupStub).props().validFilterables).toEqual(["category", "created"]);
            expect(wrapper.vm.filter.state.addedFilters).toEqual([]);
            expect(wrapper.vm.list.listState.params.id).toBe("1,2");
            // Hidden filters have no input to render, so their support is never in question.
            expect(warn).not.toHaveBeenCalled();

            wrapper.vm.filter.state.addedFilters.push({ field: "category", param: "category", value: "widgets" });
            await vue.nextTick();
            expect(wrapper.vm.list.listState.params).toMatchObject({ id: "1,2", category: "widgets" });

            warn.mockRestore();
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

        scopedIt("restores a dotted related-field filter from the URL query on load", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.filterables = ["customer.name"];
            modelConfig.config.filterableDetails = {
                "customer.name": { typeFilter: "CharField", label: "Customer Name" },
            };
            route.query = { "customer.name": "Acme" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(wrapper.vm.filter.state.addedFilters).toHaveLength(1);
            expect(wrapper.vm.filter.state.addedFilters[0]).toMatchObject({
                field: "customer.name",
                param: "customer.name",
                value: "Acme",
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

        scopedIt("applies a server-hidden filter's URL value to the initial list request", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "1,2" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(wrapper.vm.list.listState.params.id).toBe("1,2");
            expect(wrapper.vm.filter.state.addedFilters).toEqual([]);
            wrapper.unmount();
        });

        scopedIt("applies a server-hidden filter's URL value once model metadata loads after mount", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "1,2" };
            const filterables = modelConfig.config.filterables;
            const filterableDetails = modelConfig.config.filterableDetails;
            modelConfig.loading = true;
            modelConfig.config.filterables = [];
            modelConfig.config.filterableDetails = {};

            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            expect(wrapper.vm.list.listState.params.id).toBeUndefined();

            modelConfig.loading = false;
            modelConfig.config.filterables = filterables;
            modelConfig.config.filterableDetails = filterableDetails;
            await vue.nextTick();

            expect(wrapper.vm.list.listState.params.id).toBe("1,2");
            wrapper.unmount();
        });

        scopedIt("preserves a server-hidden filter's request param through a visible filter change", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "1,2" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            wrapper.vm.filter.state.addedFilters.push({ field: "category", param: "category", value: "widgets" });
            await vue.nextTick();

            expect(wrapper.vm.list.listState.params).toMatchObject({ id: "1,2", category: "widgets" });
            expect(routerPush).toHaveBeenCalledWith({ query: { id: "1,2", category: "widgets" } });
            wrapper.unmount();
        });

        scopedIt("excludes a server-hidden filter's value from the saved filter preference", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "1,2" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            wrapper.vm.filter.state.addedFilters.push({ field: "category", param: "category", value: "widgets" });
            await vue.nextTick();

            expect(listPreferenceStoreMock.setFilters).toHaveBeenLastCalledWith(
                { app: "app", model: "model" },
                { category: "widgets" },
            );
            wrapper.unmount();
        });

        scopedIt(
            "preserves a server-hidden filter's request param through editing a visible filter's value",
            async () => {
                mockedInject.mockReturnValueOnce({});
                route.params = { action: "list" };
                route.query = { id: "1,2", category: "widgets" };
                const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
                await vue.nextTick();
                expect(wrapper.vm.list.listState.params).toMatchObject({ id: "1,2", category: "widgets" });

                wrapper.vm.filter.state.addedFilters[0].value = "gadgets";
                await vue.nextTick();

                expect(wrapper.vm.list.listState.params).toMatchObject({ id: "1,2", category: "gadgets" });
                expect(routerPush).toHaveBeenCalledWith({ query: { id: "1,2", category: "gadgets" } });
                wrapper.unmount();
            },
        );

        scopedIt("preserves a server-hidden filter's request param through clearing a visible filter", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "1,2", category: "widgets" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            expect(wrapper.vm.list.listState.params).toMatchObject({ id: "1,2", category: "widgets" });

            wrapper.vm.filter.state.addedFilters.splice(0, wrapper.vm.filter.state.addedFilters.length);
            await vue.nextTick();

            expect(wrapper.vm.list.listState.params.id).toBe("1,2");
            expect(wrapper.vm.list.listState.params.category).toBeUndefined();
            expect(routerPush).toHaveBeenCalledWith({ query: { id: "1,2" } });
            wrapper.unmount();
        });

        scopedIt("preserves a server-hidden filter's request param through a sort change", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "1,2" };
            modelConfig.config.sortables = ["name"];
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            wrapper.findComponent(SortControlStub).vm.$emit("update:sorted", ["name"]);
            await vue.nextTick();

            expect(wrapper.vm.list.listState.params.id).toBe("1,2");
            expect(routerPush).toHaveBeenCalledWith({ query: { id: "1,2", [ORDERING_PARAM]: "name" } });
            wrapper.unmount();
        });

        scopedIt("preserves a server-hidden filter's request param through a search change", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "1,2" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            wrapper.vm.search.searchSlotProps.updateListSearch("widgets");
            wrapper.vm.search.filterList();
            await vue.nextTick();

            expect(wrapper.vm.list.listState.params).toMatchObject({ id: "1,2", [SEARCH_PARAM]: "widgets" });
            expect(routerPush).toHaveBeenCalledWith({ query: { id: "1,2", [SEARCH_PARAM]: "widgets" } });
            wrapper.unmount();
        });

        scopedIt(
            "removes a server-hidden filter's request param once external navigation drops it from the URL",
            async () => {
                mockedInject.mockReturnValueOnce({});
                route.params = { action: "list" };
                route.query = { id: "1,2" };
                const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
                await vue.nextTick();
                expect(wrapper.vm.list.listState.params.id).toBe("1,2");

                route.query = {};
                await vue.nextTick();

                expect(wrapper.vm.list.listState.params.id).toBeUndefined();
                wrapper.unmount();
            },
        );

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

        scopedIt("preserves options.params and active filters across each other's updates", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model", params: { id: "1,2" } } });
            await vue.nextTick();
            expect(wrapper.vm.list.listState.params.id).toBe("1,2");

            // Adding a filter must not drop the `params` prop's own key.
            wrapper.vm.filter.state.addedFilters.push({ field: "category", param: "category", value: "widgets" });
            await vue.nextTick();
            expect(wrapper.vm.list.listState.params.category).toBe("widgets");
            expect(wrapper.vm.list.listState.params.id).toBe("1,2");

            // Changing the `params` prop must not drop the active filter's key.
            await wrapper.setProps({ params: { id: "3,4" } });
            await vue.nextTick();
            expect(wrapper.vm.list.listState.params.id).toBe("3,4");
            expect(wrapper.vm.list.listState.params.category).toBe("widgets");

            // Clearing the filter must not drop the `params` prop's key.
            wrapper.vm.filter.state.addedFilters.splice(0, wrapper.vm.filter.state.addedFilters.length);
            await vue.nextTick();
            expect(wrapper.vm.list.listState.params.category).toBeUndefined();
            expect(wrapper.vm.list.listState.params.id).toBe("3,4");
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
            const cell = wrapper.find('[data-column="field.name"]');
            expect(cell.exists()).toBe(true);
            // ColumnText reproduces the historical plain-text cell: just `formatted`.
            expect(cell.text()).toBe("fmt:field.name");
            wrapper.unmount();
        });

        scopedIt("lets a consumer field(<col>) slot override the adapter", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewList, {
                props: { app: "app", model: "model" },
                slots: {
                    "field(field.name)": (slotProps) =>
                        h("span", { "data-qa": "consumer-cell" }, `consumer:${slotProps.formatted}`),
                },
            });
            await vue.nextTick();
            const cell = wrapper.find('[data-column="field.name"]');
            expect(cell.find('[data-qa="consumer-cell"]').exists()).toBe(true);
            expect(cell.text()).toBe("consumer:fmt:field.name");
            wrapper.unmount();
        });

        scopedIt("uses the columnComponents prop override", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewList, {
                props: { app: "app", model: "model", columnComponents: { "field.name": CustomColumn } },
            });
            await vue.nextTick();
            const cell = wrapper.find('[data-column="field.name"]');
            expect(cell.find('[data-qa="custom-column"]').exists()).toBe(true);
            expect(cell.text()).toBe("custom:fmt:field.name");
            wrapper.unmount();
        });

        scopedIt("uses a modelConfig.config.columnComponents override", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.columnComponents = { "field.name": CustomColumn };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            const cell = wrapper.find('[data-column="field.name"]');
            expect(cell.find('[data-qa="custom-column"]').exists()).toBe(true);
            wrapper.unmount();
        });

        scopedIt("forwards columnProps to the resolved adapter", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewList, {
                props: {
                    app: "app",
                    model: "model",
                    columnComponents: { "field.name": CustomColumn },
                    columnProps: { "field.name": { extra: "EX" } },
                },
            });
            await vue.nextTick();
            const cell = wrapper.find('[data-column="field.name"]');
            expect(cell.find('[data-qa="custom-column"]').attributes("data-extra")).toBe("EX");
            wrapper.unmount();
        });

        scopedIt("prop columnComponents beats modelConfig columnComponents", async () => {
            mockedInject.mockReturnValueOnce({});
            const ConfigColumn = defineComponent({
                name: "ConfigColumn",
                setup: () => () => h("span", { "data-qa": "config-column" }),
            });
            modelConfig.config.columnComponents = { "field.name": ConfigColumn };
            const wrapper = mount(ViewList, {
                props: { app: "app", model: "model", columnComponents: { "field.name": CustomColumn } },
            });
            await vue.nextTick();
            const cell = wrapper.find('[data-column="field.name"]');
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

    describe("Fetched fields", () => {
        scopedIt("fetches the model config's list fields plus the primary key", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.fetchFields = ["name", "code"];
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(mockedUseList.mock.calls.at(-1)[0].props.params[FIELDS_PARAM]).toEqual(["id", "name", "code"]);
            wrapper.unmount();
        });

        scopedIt("fetches the columns a displayFields prop names when listFields is empty", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.fetchFields = ["name"];
            const wrapper = mount(ViewList, {
                props: {
                    app: "app",
                    model: "model",
                    displayFields: { name: { name: "name" }, created_at: { name: "created_at" } },
                },
            });
            await vue.nextTick();

            expect(mockedUseList.mock.calls.at(-1)[0].props.params[FIELDS_PARAM]).toEqual(["id", "name", "created_at"]);
            wrapper.unmount();
        });
    });

    describe("Selection column in card layout", () => {
        scopedIt("hides the empty selection label and value when nothing can act on a selection", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            expect(objectsGridProps.cardFieldClasses.selected_).toBe("hidden");
            expect(objectsGridProps.cardHeaderClasses.selected_).toBe("hidden");
            expect(wrapper.find('[data-header-column="selected_"]').text()).toBe("");
            wrapper.unmount();
        });

        scopedIt("labels the selection checkbox when a bulk action exists", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.actionDetails = { delete: { bulk: true } };
            mockedUseFilteredActions.mockReturnValue(vue.reactive({ actions: ["delete"] }));
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            expect(objectsGridProps.cardFieldClasses.selected_).toBeUndefined();
            expect(objectsGridProps.cardHeaderClasses.selected_).toBeUndefined();
            expect(wrapper.find('[data-header-column="selected_"]').text()).toBe("Selected");
            wrapper.unmount();
        });

        scopedIt("keeps a consumer field(selected_) slot visible without selectable actions", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewList, {
                props: { app: "app", model: "model" },
                slots: { "field(selected_)": () => h("span", { "data-qa": "custom-selected" }, "pin") },
            });
            await vue.nextTick();
            expect(objectsGridProps.cardFieldClasses.selected_).toBeUndefined();
            expect(objectsGridProps.cardHeaderClasses.selected_).toBeUndefined();
            wrapper.unmount();
        });
    });

    describe("Scopes", () => {
        const scopeLabels = (wrapper) => wrapper.findAll('[data-qa="scope-chip-label"]').map((chip) => chip.text());
        const bandOpen = (wrapper) => wrapper.get('[data-qa="constraints-bar"]').attributes("data-open");

        scopedIt("shows a hidden URL filter as a scope, with its value, without an input mapping", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "3f2a9c1e-8b7d-4e21-9a55-0c1d2e3f4a5b" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(scopeLabels(wrapper)).toEqual(["id · 3f2a9c1e-8b7d-4e21-9a55-0c1d2e3f4a5b"]);
            expect(wrapper.find('[data-qa="scope-chip-clear"]').exists()).toBe(true);
            expect(bandOpen(wrapper)).toBe("true");
            expect(wrapper.findComponent(FilterGroupStub).props().validFilterables).not.toContain("id");
            wrapper.unmount();
        });

        scopedIt("labels an in-lookup hidden filter with its metadata label and value count", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.filterableDetails.id = {
                typeFilter: "NumberArrayField",
                hidden: true,
                label: "ID",
                lookupExprs: ["in"],
            };
            route.params = { action: "list" };
            route.query = { id: "1,2" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(scopeLabels(wrapper)).toEqual(["ID · 2 values"]);
            wrapper.unmount();
        });

        scopedIt("shows no scope for an in-lookup hidden filter without a URL value", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.filterableDetails.id = {
                typeFilter: "DecimalInField",
                hidden: true,
                label: "Id Is In",
                lookupExprs: ["in"],
            };
            route.params = { action: "list" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(wrapper.vm.scope.scopes).toEqual([]);
            expect(bandOpen(wrapper)).toBe("false");
            wrapper.unmount();
        });

        scopedIt("ignores empty segments in an in-lookup hidden filter's value", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.filterableDetails.id = {
                typeFilter: "DecimalInField",
                hidden: true,
                label: "Id Is In",
                lookupExprs: ["in"],
            };
            route.params = { action: "list" };
            route.query = { id: "10," };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(scopeLabels(wrapper)).toEqual(["Id Is In · 10"]);
            wrapper.unmount();
        });

        scopedIt("labels a hidden filter from a filterableDetails label override", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "batch-42" };
            const wrapper = mount(ViewList, {
                props: { app: "app", model: "model", filterableDetails: { id: { label: "Replenishment batch" } } },
            });
            await vue.nextTick();

            expect(scopeLabels(wrapper)).toEqual(["Replenishment batch · batch-42"]);
            wrapper.unmount();
        });

        scopedIt("clears a hidden URL scope's keys and request values and keeps other constraints", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "1,2", category: "widgets", [SEARCH_PARAM]: "bolt", other: "kept" };
            instanceList.state.paginateInfo.totalPages = 5;
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            wrapper.vm.list.listState.currentPage = 3;
            await vue.nextTick();
            expect(wrapper.vm.list.listState.currentPage).toBe(3);
            routerPush.mockClear();

            await wrapper.get('[data-qa="scope-chip-clear"]').trigger("click");
            await vue.nextTick();

            expect(routerPush).toHaveBeenCalledTimes(1);
            expect(routerPush).toHaveBeenCalledWith({
                query: { category: "widgets", [SEARCH_PARAM]: "bolt", other: "kept" },
            });
            expect(wrapper.vm.list.listState.params.id).toBeUndefined();
            expect(wrapper.vm.list.listState.params).toMatchObject({ category: "widgets", [SEARCH_PARAM]: "bolt" });
            expect(wrapper.vm.list.listState.currentPage).toBe(1);
            expect(wrapper.vm.filter.state.addedFilters).toHaveLength(1);
            expect(scopeLabels(wrapper)).toEqual([]);
            wrapper.unmount();
        });

        scopedIt("clears a suffixed hidden filter's suffixed keys", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.filterableDetails.created = {
                typeFilter: "DateRangeField",
                suffixes: ["after", "before"],
                label: "Created",
                hidden: true,
            };
            route.params = { action: "list" };
            route.query = { created_after: "2024-01-01", created_before: "2024-02-01" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(scopeLabels(wrapper)).toEqual(["Created · 2 values"]);
            await wrapper.get('[data-qa="scope-chip-clear"]').trigger("click");
            await vue.nextTick();

            expect(routerPush).toHaveBeenLastCalledWith({ query: {} });
            expect(wrapper.vm.list.listState.params.created_after).toBeUndefined();
            expect(wrapper.vm.list.listState.params.created_before).toBeUndefined();
            wrapper.unmount();
        });

        scopedIt("shows a declared params scope and asks the caller to clear it without mutating params", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            const params = { replenishment_batch: "b-42", tenant: "north" };
            const scopes = { replenishment_batch: { label: "Batch 42" } };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model", params, scopes } });
            await vue.nextTick();

            expect(scopeLabels(wrapper)).toEqual(["Batch 42"]);
            expect(wrapper.vm.list.listState.params).toMatchObject({ replenishment_batch: "b-42", tenant: "north" });

            await wrapper.get('[data-qa="scope-chip-clear"]').trigger("click");
            expect(wrapper.emitted("clear-scope")).toEqual([
                [{ name: "replenishment_batch", keys: ["replenishment_batch"] }],
            ]);
            expect(params).toEqual({ replenishment_batch: "b-42", tenant: "north" });
            expect(routerPush).not.toHaveBeenCalled();

            await wrapper.setProps({ params: { tenant: "north" } });
            await vue.nextTick();
            expect(scopeLabels(wrapper)).toEqual([]);
            expect(wrapper.vm.list.listState.params.replenishment_batch).toBeUndefined();
            expect(wrapper.vm.list.listState.params.tenant).toBe("north");
            wrapper.unmount();
        });

        scopedIt("treats undeclared params as request parameters, not scopes, even for a hidden filter", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            const wrapper = mount(ViewList, {
                props: { app: "app", model: "model", params: { tenant: "north", id: "4,7" } },
            });
            await vue.nextTick();

            expect(scopeLabels(wrapper)).toEqual([]);
            expect(bandOpen(wrapper)).toBe("false");
            wrapper.unmount();
        });

        scopedIt("clears every scope from Clear scopes, splitting URL and params scopes", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "1,2", category: "widgets" };
            const scopes = { replenishment_batch: { label: "Batch 42" } };
            const wrapper = mount(ViewList, {
                props: { app: "app", model: "model", params: { replenishment_batch: "b-42" }, scopes },
            });
            await vue.nextTick();
            routerPush.mockClear();

            expect(scopeLabels(wrapper)).toEqual(["id · 1,2", "Batch 42"]);
            await wrapper.get('[data-qa="scope-clear"]').trigger("click");
            await vue.nextTick();

            expect(routerPush).toHaveBeenCalledWith({ query: { category: "widgets" } });
            expect(wrapper.emitted("clear-scope")).toEqual([
                [{ name: "replenishment_batch", keys: ["replenishment_batch"] }],
            ]);
            wrapper.unmount();
        });

        scopedIt("keeps scopes through visible filter, sort, and search changes", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.sortables = ["name"];
            route.params = { action: "list" };
            route.query = { id: "1,2" };
            const scopes = { replenishment_batch: { label: "Batch 42" } };
            const wrapper = mount(ViewList, {
                props: { app: "app", model: "model", params: { replenishment_batch: "b-42" }, scopes },
            });
            await vue.nextTick();

            wrapper.vm.filter.state.addedFilters.push({ field: "category", param: "category", value: "widgets" });
            await vue.nextTick();
            wrapper.vm.sort.sorting.updateSorted(["name"]);
            await vue.nextTick();
            wrapper.vm.list.listState.search = "bolt";
            await vue.nextTick();

            expect(route.query).toMatchObject({ id: "1,2", category: "widgets", [SEARCH_PARAM]: "bolt" });
            expect(wrapper.vm.list.listState.params).toMatchObject({
                id: "1,2",
                replenishment_batch: "b-42",
                category: "widgets",
                [SEARCH_PARAM]: "bolt",
            });
            expect(scopeLabels(wrapper)).toEqual(["id · 1,2", "Batch 42"]);
            wrapper.unmount();
        });

        scopedIt("labels a declared params filter from its metadata when the declaration has no label", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.filterableDetails.id = {
                typeFilter: "DecimalInField",
                hidden: true,
                label: "Id Is In",
                lookupExprs: ["in"],
            };
            route.params = { action: "list" };
            const wrapper = mount(ViewList, {
                props: {
                    app: "app",
                    model: "model",
                    params: { id: "4,7", tenant: "north" },
                    scopes: { id: {}, tenant: {} },
                },
            });
            await vue.nextTick();

            expect(scopeLabels(wrapper)).toEqual(["Id Is In · 2 values", "tenant · north"]);
            wrapper.unmount();
        });

        scopedIt("owns a declared params filter's suffixed keys", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            const wrapper = mount(ViewList, {
                props: {
                    app: "app",
                    model: "model",
                    params: { created_after: "2024-01-01" },
                    scopes: { created: { label: "This quarter" } },
                },
            });
            await vue.nextTick();

            expect(wrapper.vm.scope.scopes).toEqual([
                {
                    name: "created",
                    label: "This quarter",
                    keys: ["created_after", "created_before"],
                    source: "params",
                    clearable: true,
                },
            ]);
            wrapper.unmount();
        });

        scopedIt("shows a params scope declared clearable: false without a clear control", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "1,2" };
            const scopes = {
                replenishment_batch: { label: "Batch 42", clearable: false },
                tenant: { label: "North" },
            };
            const wrapper = mount(ViewList, {
                props: {
                    app: "app",
                    model: "model",
                    params: { replenishment_batch: "b-42", tenant: "north" },
                    scopes,
                },
            });
            await vue.nextTick();
            routerPush.mockClear();

            const chips = wrapper.findAll('[data-qa="scope-chip"]');
            expect(chips.map((chip) => chip.find('[data-qa="scope-chip-clear"]').exists())).toEqual([
                true,
                false,
                true,
            ]);

            await wrapper.get('[data-qa="scope-clear"]').trigger("click");
            await vue.nextTick();
            expect(routerPush).toHaveBeenCalledWith({ query: {} });
            expect(wrapper.emitted("clear-scope")).toEqual([[{ name: "tenant", keys: ["tenant"] }]]);
            wrapper.unmount();
        });

        scopedIt("forwards the scope-chip slot to the scope group", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "1,2", category: "widgets" };
            const wrapper = mount(ViewList, {
                props: { app: "app", model: "model" },
                slots: {
                    // FilterGroupStub renders every forwarded slot without props; only ScopeGroup passes a scope.
                    "scope-chip": (slotProps) =>
                        slotProps?.scope
                            ? h(
                                  "button",
                                  { "data-qa": "custom-scope-chip", onClick: slotProps.clear },
                                  `Only ${slotProps.scope.name}`,
                              )
                            : null,
                },
            });
            await vue.nextTick();
            routerPush.mockClear();

            expect(wrapper.get('[data-qa="custom-scope-chip"]').text()).toBe("Only id");
            await wrapper.get('[data-qa="custom-scope-chip"]').trigger("click");
            await vue.nextTick();
            expect(routerPush).toHaveBeenCalledWith({ query: { category: "widgets" } });
            wrapper.unmount();
        });

        scopedIt("collapses the constraints band when no scope, filter, or sort is active", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(scopeLabels(wrapper)).toEqual([]);
            expect(bandOpen(wrapper)).toBe("false");
            wrapper.unmount();
        });

        scopedIt("renders a single root element", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "1,2" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(wrapper.vm.$el.nodeType).toBe(Node.ELEMENT_NODE);
            wrapper.unmount();
        });

        scopedIt("collapses the constraints band once the last scope is cleared", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "1,2" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();
            expect(bandOpen(wrapper)).toBe("true");

            await wrapper.get('[data-qa="scope-chip-clear"]').trigger("click");
            await vue.nextTick();

            expect(scopeLabels(wrapper)).toEqual([]);
            expect(bandOpen(wrapper)).toBe("false");
            wrapper.unmount();
        });

        scopedIt("clearing one URL scope keeps the other URL scope and a params scope", async () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.filterableDetails.created.hidden = true;
            route.params = { action: "list" };
            route.query = { id: "1,2", created_after: "2024-01-01" };
            const wrapper = mount(ViewList, {
                props: {
                    app: "app",
                    model: "model",
                    params: { replenishment_batch: "b-42" },
                    scopes: { replenishment_batch: { label: "Batch 42" } },
                },
            });
            await vue.nextTick();
            routerPush.mockClear();
            expect(scopeLabels(wrapper)).toEqual(["id · 1,2", "Created · 2024-01-01", "Batch 42"]);

            await wrapper.findAll('[data-qa="scope-chip-clear"]')[0].trigger("click");
            await vue.nextTick();

            expect(routerPush).toHaveBeenCalledTimes(1);
            expect(routerPush).toHaveBeenCalledWith({ query: { created_after: "2024-01-01" } });
            expect(wrapper.emitted("clear-scope")).toBeUndefined();
            expect(scopeLabels(wrapper)).toEqual(["Created · 2024-01-01", "Batch 42"]);
            expect(wrapper.vm.list.listState.params.id).toBeUndefined();
            expect(wrapper.vm.list.listState.params).toMatchObject({
                created_after: "2024-01-01",
                replenishment_batch: "b-42",
            });
            wrapper.unmount();
        });

        scopedIt("counts a repeated query key's values and clears every occurrence", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: ["a", "b"] };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
            await vue.nextTick();

            expect(scopeLabels(wrapper)).toEqual(["id · 2 values"]);
            await wrapper.get('[data-qa="scope-chip-clear"]').trigger("click");
            await vue.nextTick();

            expect(routerPush).toHaveBeenLastCalledWith({ query: {} });
            expect(wrapper.vm.list.listState.params.id).toBeUndefined();
            wrapper.unmount();
        });

        scopedIt("shows a params scope that a later params update adds", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            const scopes = { replenishment_batch: { label: "Batch 42" } };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model", params: {}, scopes } });
            await vue.nextTick();
            expect(scopeLabels(wrapper)).toEqual([]);

            await wrapper.setProps({ params: { replenishment_batch: "b-42" } });
            await vue.nextTick();

            expect(scopeLabels(wrapper)).toEqual(["Batch 42"]);
            expect(wrapper.vm.list.listState.params.replenishment_batch).toBe("b-42");
            expect(bandOpen(wrapper)).toBe("true");
            wrapper.unmount();
        });

        scopedIt("ignores a hidden URL filter left out of an overridden filterables list", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "1,2" };
            const wrapper = mount(ViewList, { props: { app: "app", model: "model", filterables: ["category"] } });
            await vue.nextTick();

            expect(scopeLabels(wrapper)).toEqual([]);
            expect(wrapper.vm.list.listState.params.id).toBeUndefined();
            wrapper.unmount();
        });

        scopedIt("shows only params scopes on a list that does not own the route", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { app: "elsewhere", model: "record", action: "list" };
            route.query = { id: "1,2" };
            const wrapper = mount(ViewList, {
                props: {
                    app: "app",
                    model: "model",
                    params: { purchase_order: "7" },
                    scopes: { purchase_order: { label: "Order 7", clearable: false } },
                },
            });
            await vue.nextTick();

            expect(scopeLabels(wrapper)).toEqual(["Order 7"]);
            expect(wrapper.find('[data-qa="scope-chip-clear"]').exists()).toBe(false);
            wrapper.vm.scope.clearUrlScopes(["id"]);
            await vue.nextTick();
            expect(routerPush).not.toHaveBeenCalled();
            expect(route.query).toEqual({ id: "1,2" });
            wrapper.unmount();
        });

        scopedIt("keeps the before-list slot alongside the scope chips", async () => {
            mockedInject.mockReturnValueOnce({});
            route.params = { action: "list" };
            route.query = { id: "1,2" };
            const wrapper = mount(ViewList, {
                props: { app: "app", model: "model" },
                slots: { "before-list": () => h("div", { "data-qa": "custom-banner" }, "Showing batch 42") },
            });
            await vue.nextTick();

            expect(wrapper.get('[data-qa="custom-banner"]').text()).toBe("Showing batch 42");
            expect(scopeLabels(wrapper)).toEqual(["id · 1,2"]);
            wrapper.unmount();
        });

        describe("A hidden filter carried by both the URL and params", () => {
            const mountBoth = async (props = {}) => {
                route.params = { action: "list" };
                route.query = { id: "1,2" };
                const wrapper = mount(ViewList, {
                    props: { app: "app", model: "model", params: { id: "4,7" }, scopes: { id: {} }, ...props },
                });
                await vue.nextTick();
                return wrapper;
            };
            const scopeSources = (wrapper) => wrapper.vm.scope.scopes.map(({ source, name }) => `${source}:${name}`);

            scopedIt("sends the params value and shows only the params scope, leaving the URL as is", async () => {
                mockedInject.mockReturnValueOnce({});
                const wrapper = await mountBoth();

                expect(wrapper.vm.list.listState.params.id).toBe("4,7");
                expect(scopeSources(wrapper)).toEqual(["params:id"]);
                expect(scopeLabels(wrapper)).toEqual(["id · 4,7"]);
                expect(route.query).toEqual({ id: "1,2" });
                expect(routerPush).not.toHaveBeenCalled();
                wrapper.unmount();
            });

            scopedIt("leaves the URL value, sort, visible filters, and preferences alone", async () => {
                mockedInject.mockReturnValueOnce({});
                modelConfig.config.sortables = ["name"];
                const wrapper = await mountBoth();

                wrapper.vm.filter.state.addedFilters.push({ field: "category", param: "category", value: "widgets" });
                await vue.nextTick();
                wrapper.vm.sort.sorting.updateSorted(["name"]);
                await vue.nextTick();

                expect(route.query).toEqual({ id: "1,2", category: "widgets", [ORDERING_PARAM]: "name" });
                expect(wrapper.vm.list.listState.params).toMatchObject({ id: "4,7", category: "widgets" });
                expect(listPreferenceStoreMock.setFilters).toHaveBeenCalled();
                for (const [, stored] of listPreferenceStoreMock.setFilters.mock.calls) {
                    expect(stored).not.toHaveProperty("id");
                }
                expect(scopeSources(wrapper)).toEqual(["params:id"]);
                wrapper.unmount();
            });

            scopedIt("sends the params value when model metadata loads after mount", async () => {
                mockedInject.mockReturnValueOnce({});
                modelConfig.loading = true;
                modelConfig.config.filterables = [];
                modelConfig.config.filterableDetails = {};
                const wrapper = await mountBoth();

                modelConfig.config.filterables = ["id"];
                modelConfig.config.filterableDetails = { id: { typeFilter: "UUIDField", hidden: true } };
                modelConfig.loading = false;
                await vue.nextTick();
                await vue.nextTick();

                expect(wrapper.vm.list.listState.params.id).toBe("4,7");
                expect(scopeSources(wrapper)).toEqual(["params:id"]);
                wrapper.unmount();
            });

            scopedIt("applies the URL value once the caller removes the key from params", async () => {
                mockedInject.mockReturnValueOnce({});
                const wrapper = await mountBoth();

                await wrapper.setProps({ params: {} });
                await vue.nextTick();

                expect(wrapper.vm.list.listState.params.id).toBe("1,2");
                expect(scopeSources(wrapper)).toEqual(["url:id"]);
                expect(route.query).toEqual({ id: "1,2" });
                wrapper.unmount();
            });

            scopedIt("switches to the params value when the caller adds the key after mount", async () => {
                mockedInject.mockReturnValueOnce({});
                const wrapper = await mountBoth({ params: {} });
                expect(wrapper.vm.list.listState.params.id).toBe("1,2");
                expect(scopeSources(wrapper)).toEqual(["url:id"]);

                await wrapper.setProps({ params: { id: "4,7" } });
                await vue.nextTick();

                expect(wrapper.vm.list.listState.params.id).toBe("4,7");
                expect(scopeSources(wrapper)).toEqual(["params:id"]);
                wrapper.unmount();
            });

            scopedIt("follows a params value change and ignores a URL value change", async () => {
                mockedInject.mockReturnValueOnce({});
                const wrapper = await mountBoth();

                await wrapper.setProps({ params: { id: "9" } });
                await vue.nextTick();
                expect(wrapper.vm.list.listState.params.id).toBe("9");

                route.query = { id: "5" };
                await vue.nextTick();
                await vue.nextTick();
                expect(wrapper.vm.list.listState.params.id).toBe("9");
                expect(scopeSources(wrapper)).toEqual(["params:id"]);
                wrapper.unmount();
            });

            scopedIt("ignores every URL key of a suffixed hidden filter when params carries one of them", async () => {
                mockedInject.mockReturnValueOnce({});
                modelConfig.config.filterableDetails.created.hidden = true;
                route.params = { action: "list" };
                route.query = { created_before: "2024-02-01" };
                const wrapper = mount(ViewList, {
                    props: { app: "app", model: "model", params: { created_after: "2024-01-01" } },
                });
                await vue.nextTick();

                expect(wrapper.vm.list.listState.params.created_after).toBe("2024-01-01");
                expect(wrapper.vm.list.listState.params.created_before).toBeUndefined();
                expect(wrapper.vm.scope.scopes).toEqual([]);
                expect(route.query).toEqual({ created_before: "2024-02-01" });
                wrapper.unmount();
            });

            scopedIt("gives an undeclared params key the same precedence", async () => {
                mockedInject.mockReturnValueOnce({});
                const wrapper = await mountBoth({ scopes: {} });

                expect(wrapper.vm.list.listState.params.id).toBe("4,7");
                expect(wrapper.vm.scope.scopes).toEqual([]);
                expect(bandOpen(wrapper)).toBe("false");
                wrapper.unmount();
            });
        });

        describe("A visible filter carried by params", () => {
            const offered = (wrapper) => wrapper.findComponent(FilterGroupStub).props().validFilterables;

            scopedIt("is not offered or restored, and params supplies its value", async () => {
                mockedInject.mockReturnValueOnce({});
                route.params = { action: "list" };
                route.query = { category: "widgets" };
                const wrapper = mount(ViewList, {
                    props: { app: "app", model: "model", params: { category: "bolts" } },
                });
                await vue.nextTick();

                expect(offered(wrapper)).not.toContain("category");
                expect(wrapper.vm.filter.state.addedFilters).toEqual([]);
                expect(wrapper.vm.list.listState.params.category).toBe("bolts");
                expect(wrapper.vm.scope.scopes).toEqual([]);
                expect(route.query).toEqual({ category: "widgets" });
                expect(routerPush).not.toHaveBeenCalled();
                wrapper.unmount();
            });

            scopedIt("keeps its URL value through sort and search changes without saving it", async () => {
                mockedInject.mockReturnValueOnce({});
                modelConfig.config.sortables = ["name"];
                route.params = { action: "list" };
                route.query = { category: "widgets" };
                const wrapper = mount(ViewList, {
                    props: { app: "app", model: "model", params: { category: "bolts" } },
                });
                await vue.nextTick();

                wrapper.vm.sort.sorting.updateSorted(["name"]);
                await vue.nextTick();
                wrapper.vm.list.listState.search = "bolt";
                await vue.nextTick();

                expect(route.query).toEqual({ category: "widgets", [ORDERING_PARAM]: "name", [SEARCH_PARAM]: "bolt" });
                expect(wrapper.vm.list.listState.params.category).toBe("bolts");
                expect(listPreferenceStoreMock.setFilters).toHaveBeenCalled();
                for (const [, stored] of listPreferenceStoreMock.setFilters.mock.calls) {
                    expect(stored).not.toHaveProperty("category");
                }
                wrapper.unmount();
            });

            scopedIt("does not restore its stored preference into the URL", async () => {
                mockedInject.mockReturnValueOnce({});
                listPreferenceStoreMock.getFilters.mockReturnValue({ category: "stored", created_after: "2024-01-01" });
                route.params = { action: "list" };
                const wrapper = mount(ViewList, {
                    props: { app: "app", model: "model", params: { category: "bolts" } },
                });
                await vue.nextTick();
                await vue.nextTick();

                expect(routerPush).toHaveBeenCalledWith({ query: { created_after: "2024-01-01" } });
                expect(wrapper.vm.list.listState.params.category).toBe("bolts");
                wrapper.unmount();
            });

            scopedIt("drops a reader's filter chip when the caller adds the key, leaving the URL", async () => {
                mockedInject.mockReturnValueOnce({});
                route.params = { action: "list" };
                route.query = { category: "widgets" };
                const wrapper = mount(ViewList, { props: { app: "app", model: "model", params: {} } });
                await vue.nextTick();
                expect(wrapper.vm.filter.state.addedFilters).toHaveLength(1);
                expect(wrapper.vm.list.listState.params.category).toBe("widgets");
                routerPush.mockClear();

                await wrapper.setProps({ params: { category: "bolts" } });
                await vue.nextTick();
                await vue.nextTick();

                expect(wrapper.vm.filter.state.addedFilters).toEqual([]);
                expect(offered(wrapper)).not.toContain("category");
                expect(wrapper.vm.list.listState.params.category).toBe("bolts");
                expect(route.query).toEqual({ category: "widgets" });
                expect(routerPush).not.toHaveBeenCalled();
                wrapper.unmount();
            });

            scopedIt("returns to normal, restoring its URL value, once the caller drops the key", async () => {
                mockedInject.mockReturnValueOnce({});
                route.params = { action: "list" };
                route.query = { category: "widgets" };
                const wrapper = mount(ViewList, {
                    props: { app: "app", model: "model", params: { category: "bolts" } },
                });
                await vue.nextTick();

                await wrapper.setProps({ params: {} });
                await vue.nextTick();
                await vue.nextTick();

                expect(offered(wrapper)).toContain("category");
                expect(wrapper.vm.filter.state.addedFilters).toHaveLength(1);
                expect(wrapper.vm.list.listState.params.category).toBe("widgets");
                expect(route.query).toEqual({ category: "widgets" });
                wrapper.unmount();
            });

            scopedIt("is offered again after the reader clears its declared scope", async () => {
                mockedInject.mockReturnValueOnce({});
                route.params = { action: "list" };
                const wrapper = mount(ViewList, {
                    props: {
                        app: "app",
                        model: "model",
                        params: { category: "bolts" },
                        scopes: { category: { label: "Bolts only" } },
                    },
                });
                await vue.nextTick();
                expect(scopeLabels(wrapper)).toEqual(["Bolts only"]);
                expect(offered(wrapper)).not.toContain("category");

                await wrapper.get('[data-qa="scope-chip-clear"]').trigger("click");
                expect(wrapper.emitted("clear-scope")).toEqual([[{ name: "category", keys: ["category"] }]]);
                await wrapper.setProps({ params: {} });
                await vue.nextTick();

                expect(scopeLabels(wrapper)).toEqual([]);
                expect(offered(wrapper)).toContain("category");
                expect(wrapper.vm.list.listState.params.category).toBeUndefined();
                wrapper.unmount();
            });
        });

        describe("Page reset", () => {
            const mountOnPageThree = async () => {
                route.params = { action: "list" };
                route.query = { id: "1,2", other: "kept" };
                instanceList.state.paginateInfo.totalPages = 5;
                const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
                await vue.nextTick();
                wrapper.vm.list.listState.currentPage = 3;
                await vue.nextTick();
                expect(wrapper.vm.list.listState.params[PAGE_PARAM]).toBe(3);
                return wrapper;
            };

            scopedIt("returns to page 1 when navigation changes a hidden filter's value", async () => {
                mockedInject.mockReturnValueOnce({});
                const wrapper = await mountOnPageThree();

                route.query = { id: "7,8", other: "kept" };
                await vue.nextTick();
                await vue.nextTick();

                expect(wrapper.vm.list.listState.currentPage).toBe(1);
                expect(wrapper.vm.list.listState.params[PAGE_PARAM]).toBeUndefined();
                expect(wrapper.vm.list.listState.params.id).toBe("7,8");
                expect(scopeLabels(wrapper)).toEqual(["id · 7,8"]);
                wrapper.unmount();
            });

            scopedIt("keeps the page when navigation changes only an unrelated query key", async () => {
                mockedInject.mockReturnValueOnce({});
                const wrapper = await mountOnPageThree();

                route.query = { id: "1,2", other: "changed" };
                await vue.nextTick();
                await vue.nextTick();

                expect(wrapper.vm.list.listState.currentPage).toBe(3);
                expect(wrapper.vm.list.listState.params[PAGE_PARAM]).toBe(3);
                wrapper.unmount();
            });

            const mountParamsOnPageThree = async (props) => {
                route.params = { action: "list" };
                instanceList.state.paginateInfo.totalPages = 5;
                const wrapper = mount(ViewList, { props: { app: "app", model: "model", ...props } });
                await vue.nextTick();
                wrapper.vm.list.listState.currentPage = 3;
                await vue.nextTick();
                expect(wrapper.vm.list.listState.params[PAGE_PARAM]).toBe(3);
                return wrapper;
            };

            scopedIt("returns to page 1 when the caller clears a params scope from a later page", async () => {
                mockedInject.mockReturnValueOnce({});
                const wrapper = await mountParamsOnPageThree({ params: { batch: "42" }, scopes: { batch: {} } });

                await wrapper.get('[data-qa="scope-chip-clear"]').trigger("click");
                expect(wrapper.emitted("clear-scope")).toEqual([[{ name: "batch", keys: ["batch"] }]]);
                await wrapper.setProps({ params: {} });
                await vue.nextTick();

                expect(wrapper.vm.list.listState.currentPage).toBe(1);
                expect(wrapper.vm.list.listState.params[PAGE_PARAM]).toBeUndefined();
                expect(wrapper.vm.list.listState.params.batch).toBeUndefined();
                wrapper.unmount();
            });

            scopedIt("keeps the search term in the request when params change", async () => {
                mockedInject.mockReturnValueOnce({});
                route.query = { [SEARCH_PARAM]: "bolt" };
                const wrapper = await mountParamsOnPageThree({ params: { batch: "42" } });
                expect(wrapper.vm.list.listState.params[SEARCH_PARAM]).toBe("bolt");

                await wrapper.setProps({ params: { batch: "43" } });
                await vue.nextTick();

                expect(wrapper.vm.list.listState.search).toBe("bolt");
                expect(wrapper.vm.list.listState.params[SEARCH_PARAM]).toBe("bolt");
                expect(wrapper.vm.list.listState.params.batch).toBe("43");
                expect(wrapper.vm.list.listState.currentPage).toBe(1);
                wrapper.unmount();
            });

            scopedIt("keeps the search term in the request when params change on page 1", async () => {
                mockedInject.mockReturnValueOnce({});
                route.params = { action: "list" };
                route.query = { [SEARCH_PARAM]: "bolt" };
                const wrapper = mount(ViewList, { props: { app: "app", model: "model", params: { batch: "42" } } });
                await vue.nextTick();
                expect(wrapper.vm.list.listState.params[SEARCH_PARAM]).toBe("bolt");

                await wrapper.setProps({ params: { batch: "43" } });
                await vue.nextTick();

                expect(wrapper.vm.list.listState.params[SEARCH_PARAM]).toBe("bolt");
                expect(wrapper.vm.list.listState.params.batch).toBe("43");
                wrapper.unmount();
            });

            scopedIt("keeps the page when params are replaced with equal content", async () => {
                mockedInject.mockReturnValueOnce({});
                const wrapper = await mountParamsOnPageThree({ params: { batch: "42" } });

                await wrapper.setProps({ params: { batch: "42" } });
                await vue.nextTick();

                expect(wrapper.vm.list.listState.currentPage).toBe(3);
                expect(wrapper.vm.list.listState.params[PAGE_PARAM]).toBe(3);
                wrapper.unmount();
            });

            scopedIt("returns to page 1 on a params change in a list that does not own the route", async () => {
                mockedInject.mockReturnValueOnce({});
                route.params = { app: "elsewhere", model: "record", action: "read" };
                instanceList.state.paginateInfo.totalPages = 5;
                const wrapper = mount(ViewList, { props: { app: "app", model: "model", params: { order: "7" } } });
                await vue.nextTick();
                wrapper.vm.list.listState.currentPage = 3;
                await vue.nextTick();
                expect(wrapper.vm.list.listState.params[PAGE_PARAM]).toBe(3);

                await wrapper.setProps({ params: { order: "8" } });
                await vue.nextTick();

                expect(wrapper.vm.list.listState.currentPage).toBe(1);
                expect(wrapper.vm.list.listState.params[PAGE_PARAM]).toBeUndefined();
                expect(wrapper.vm.list.listState.params.order).toBe("8");
                wrapper.unmount();
            });

            scopedIt("returns to page 1 when the reader changes the sort", async () => {
                mockedInject.mockReturnValueOnce({});
                modelConfig.config.sortables = ["name"];
                const wrapper = await mountParamsOnPageThree({});

                wrapper.vm.sort.sorting.updateSorted(["name"]);
                await vue.nextTick();
                await vue.nextTick();

                expect(wrapper.vm.list.listState.currentPage).toBe(1);
                expect(wrapper.vm.list.listState.params[PAGE_PARAM]).toBeUndefined();
                expect(wrapper.vm.list.listState.params[ORDERING_PARAM]).toEqual(["name"]);
                wrapper.unmount();
            });
        });

        describe("Late model metadata", () => {
            const loadMetadata = async (filterableDetails) => {
                modelConfig.config.filterables = Object.keys(filterableDetails);
                modelConfig.config.filterableDetails = filterableDetails;
                modelConfig.loading = false;
                await vue.nextTick();
                await vue.nextTick();
            };

            beforeEach(() => {
                modelConfig.loading = true;
                modelConfig.config.filterables = [];
                modelConfig.config.filterableDetails = {};
            });

            scopedIt("shows a hidden URL filter's scope and sends its value once metadata loads", async () => {
                mockedInject.mockReturnValueOnce({});
                route.params = { action: "list" };
                route.query = { id: "1,2" };
                const wrapper = mount(ViewList, { props: { app: "app", model: "model" } });
                await vue.nextTick();

                expect(wrapper.vm.scope.scopes).toEqual([]);
                expect(bandOpen(wrapper)).toBe("false");
                wrapper.vm.scope.clearUrlScopes(["id"]);
                await vue.nextTick();
                expect(routerPush).not.toHaveBeenCalled();

                await loadMetadata({
                    id: { typeFilter: "DecimalInField", hidden: true, label: "Id Is In", lookupExprs: ["in"] },
                });

                expect(scopeLabels(wrapper)).toEqual(["Id Is In · 2 values"]);
                expect(wrapper.vm.list.listState.params.id).toBe("1,2");
                expect(bandOpen(wrapper)).toBe("true");
                wrapper.unmount();
            });

            scopedIt("holds params scopes until metadata supplies their labels and suffixed keys", async () => {
                mockedInject.mockReturnValueOnce({});
                route.params = { action: "list" };
                const wrapper = mount(ViewList, {
                    props: {
                        app: "app",
                        model: "model",
                        params: { id: "4,7", created_after: "2024-01-01" },
                        scopes: { id: {}, created: {} },
                    },
                });
                await vue.nextTick();

                expect(wrapper.vm.scope.scopes).toEqual([]);
                expect(bandOpen(wrapper)).toBe("false");

                await loadMetadata({
                    id: { typeFilter: "DecimalInField", hidden: true, label: "Id Is In", lookupExprs: ["in"] },
                    created: { typeFilter: "DateRangeField", suffixes: ["after", "before"], label: "Created" },
                });

                expect(wrapper.vm.scope.scopes.map(({ label, keys }) => ({ label, keys }))).toEqual([
                    { label: "Id Is In · 2 values", keys: ["id"] },
                    { label: "Created · 2024-01-01", keys: ["created_after", "created_before"] },
                ]);
                wrapper.unmount();
            });
        });
    });
});
