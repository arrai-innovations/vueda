// Clearing a sort and a filter close together must clear both, even though each is written to the
// route independently. Reproducing that requires navigations that resolve asynchronously, the way
// they do in a browser: `ViewList.spec.js` mocks `router.push`/`router.replace` to assign
// `route.query` synchronously, which would let each write land before the next is computed and
// mask a failure here. This file mounts ViewList against a real vue-router instance (memory
// history) instead.
import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { ORDERING_PARAM } from "@vueda/utils/constants.js";
import flushPromises from "flush-promises";
import { defineComponent, h, nextTick, reactive, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

const mockedUseLookupContext = vi.fn();
vi.mock("@vueda/use/useLookupContext.js", () => ({
    useLookupContext: mockedUseLookupContext,
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
const ErrorDisplayStub = defineComponent({
    name: "ErrorDisplayStub",
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "error-display", ...attrs });
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
const ObjectsGridStub = defineComponent({
    name: "ObjectsGridStub",
    props: ["fields"],
    emits: ["update:isTable"],
    setup(props, { slots, attrs }) {
        return () =>
            h("div", { "data-qa": "objects-grid", ...attrs }, [
                slots.default ? slots.default() : null,
                ...(props.fields || []).map((field) => {
                    const slot = slots[`field(${field.name})`];
                    if (!slot) {
                        return null;
                    }
                    return h(
                        "div",
                        { "data-column": field.name },
                        slot({ field, formatted: `fmt:${field.name}`, value: `val:${field.name}`, pk: 1 }),
                    );
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
const SelectStub = defineComponent({
    name: "SelectStub",
    props: { modelValue: {}, multiple: { type: Boolean } },
    emits: ["update:modelValue"],
    setup(props, { slots, attrs }) {
        return () => h("div", { "data-qa": "select", ...attrs }, slots.default ? slots.default() : null);
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

// Deliberately NOT mocking "vue" or "vue-router" here (unlike ViewList.spec.js): the whole point
// of this file is to exercise real, asynchronously-resolving navigations.
const RouteHostStub = defineComponent({ name: "RouteHostStub", render: () => h("div") });

let ViewList, router, modelConfig, instanceList;

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
    resetListPreferenceStoreMock();
    modelConfig = reactive({
        loading: ref(false),
        errored: ref(false),
        error: ref(null),
        clearError: vi.fn(),
        info: { pk: "id" },
        config: {
            displayFields: ["field__name"],
            fieldDetails: { field__name: {} },
            verboseNamePlural: "items",
            actionDetails: {},
            fetchFields: [],
            sortables: ["name"],
            filterables: ["category"],
            filterableDetails: {
                category: { typeFilter: "ChoiceField", label: "Category" },
            },
        },
    });
    mockedUseModelConfig.mockReturnValue(modelConfig);
    mockedUseWorkflowTransitions.mockReturnValue(
        reactive({
            transitions: [],
            loading: ref(false),
            error: ref(null),
            errored: ref(false),
            clearError: vi.fn(),
        }),
    );
    mockedUseFilteredActions.mockReturnValue(reactive({ actions: [] }));
    instanceList = {
        state: reactive({
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

    router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/:app/:model/:action", name: "crud", component: RouteHostStub }],
    });
    router.push(`/app/model/list?${ORDERING_PARAM}=name&category=widgets`);
    await router.isReady();

    ViewList = (await import("@vueda/views/ViewList.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/views/ViewList.vue", () => {
    describe("Route write race (real router)", () => {
        scopedIt("keeps a cleared sort and a cleared filter both cleared when their route writes overlap", async () => {
            const wrapper = mount(ViewList, {
                props: { app: "app", model: "model" },
                global: { plugins: [router] },
            });
            await flushPromises();
            await nextTick();

            // Sanity check: both constraints started active, restored from the URL.
            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual(["name"]);
            expect(wrapper.vm.filter.state.addedFilters).toHaveLength(1);

            // Clear the sort and the filter without awaiting in between, so both writers
            // compute their next `router.push` off the same not-yet-settled `route.query`,
            // the way two nearly-simultaneous UI interactions would in a browser.
            wrapper.findComponent(SortControlStub).vm.$emit("update:sorted", []);
            wrapper.vm.filter.state.addedFilters.splice(0, wrapper.vm.filter.state.addedFilters.length);

            await flushPromises();
            await nextTick();
            await flushPromises();
            await nextTick();

            // Both constraints were cleared; neither push should be allowed to resurrect the
            // other's stale reading of the query.
            expect(router.currentRoute.value.query[ORDERING_PARAM]).toBeUndefined();
            expect(router.currentRoute.value.query.category).toBeUndefined();
            expect(wrapper.findComponent(SortControlStub).props("sorted")).toEqual([]);
            expect(wrapper.vm.filter.state.addedFilters).toEqual([]);
            wrapper.unmount();
        });
    });
});
