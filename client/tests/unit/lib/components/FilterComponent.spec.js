import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, reactive, ref } from "vue";

// Stubs
const ButtonStub = defineComponent({
    name: "ButtonStub",
    emits: ["click"],
    setup(_, { emit, slots, attrs }) {
        return () =>
            h(
                "button",
                { "data-qa": "button", ...attrs, onClick: (e) => emit("click", e) },
                slots.default ? slots.default() : null,
            );
    },
});
const ButtonGroupStub = defineComponent({
    name: "ButtonGroupStub",
    props: ["size"],
    setup(props, { slots }) {
        return () =>
            h("div", { "data-qa": "button-group", "data-size": props.size }, slots.default ? slots.default() : null);
    },
});

const FilterFormStub = defineComponent({
    name: "FilterFormStub",
    props: ["filterName", "filterLabel", "applyFilter", "hasFilterValue"],
    setup(props, { slots }) {
        return () => h("form", { "data-qa": "filter-form" }, slots.default ? slots.default() : null);
    },
});
let popoverToggle, popoverHide;
const PopoverStub = defineComponent({
    name: "PopoverStub",
    setup(_, { expose, slots }) {
        popoverToggle = vi.fn();
        popoverHide = vi.fn();
        expose({ toggle: popoverToggle, hide: popoverHide });
        return () => h("div", { "data-qa": "popover" }, slots.default ? slots.default() : null);
    },
});

vi.mock("primevue/button", () => ({ default: ButtonStub }));
vi.mock("primevue/buttongroup", () => ({ default: ButtonGroupStub }));
vi.mock("primevue/popover", () => ({ default: PopoverStub }));
vi.mock("@vueda/components/FilterForm.vue", () => ({ default: FilterFormStub }));

const mockedUseSlotNameResolver = vi.fn(() => ({ name: "slot" }));
vi.mock("@vueda/use/useSlotNameResolver.js", () => ({ useSlotNameResolver: mockedUseSlotNameResolver }));

const mockedUseModelChoices = vi.fn(() => ({ choices: {} }));
vi.mock("@vueda/use/useModelChoices.js", () => ({ useModelChoices: mockedUseModelChoices }));

const mockedUseForm = vi.fn();
vi.mock("@vueda/use/useForm.js", async () => {
    const actual = await vi.importActual("@vueda/use/useForm.js");
    return { __esModule: true, ...actual, useForm: mockedUseForm };
});
const themeFn = vi.fn(() => "t");
const mockedUseTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
    mergeTheme: (...themes) => Object.assign({}, ...themes),
}));

const route = { query: {} };
vi.mock("vue-router", () => ({ useRoute: () => route }));

let FilterComponent;

beforeEach(async () => {
    mockedUseForm.mockReset();
    FilterComponent = (await import("@vueda/components/FilterComponent.vue")).default;
    popoverToggle = undefined;
    popoverHide = undefined;
    mockedUseSlotNameResolver.mockClear();
    mockedUseTheme.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
});

function mountComponent(options = {}) {
    const addedFilters = ref([]);
    const wrapper = mount(FilterComponent, {
        props: {
            filterName: "status",
            index: 0,
            filterDetails: { label: "Status", typeFilter: "ModelChoiceField" },
            params: {},
            modelValue: addedFilters.value,
            "onUpdate:modelValue": (v) => (addedFilters.value = v),
            ...options.props,
        },
        global: {
            stubs: {
                Button: ButtonStub,
                ButtonGroup: ButtonGroupStub,
                Popover: PopoverStub,
                FilterForm: FilterFormStub,
            },
        },
    });
    return { wrapper, addedFilters };
}

describe("lib/components/FilterComponent.vue", () => {
    scopedIt("doToggle toggles show state and calls popover", () => {
        const state = reactive({ submittingValues: { status: "submitted" } });
        mockedUseForm.mockReturnValue({ state });
        const { wrapper } = mountComponent();
        const event = { preventDefault: vi.fn() };
        expect(wrapper.vm.internalShowState).toBe(false);
        wrapper.vm.doToggle(event);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(wrapper.vm.internalShowState).toBe(true);
        expect(popoverToggle).toHaveBeenCalledWith(event);
    });

    scopedIt("applyFilter adds and updates filter", async () => {
        const state = reactive({ submittingValues: { status: "open" } });
        mockedUseForm.mockReturnValue({ state });
        const { wrapper, addedFilters } = mountComponent();
        wrapper.vm.applyFilter();
        expect(addedFilters.value).toHaveLength(1);
        expect(addedFilters.value[0].value).toBe("open");
        expect(wrapper.vm.computedFilterLabel).toBe("Status | open");
        expect(popoverHide).toHaveBeenCalled();
        expect(wrapper.emitted()["hide-filter-form"][0]).toEqual(["status"]);

        state.submittingValues["status"] = "closed";
        await nextTick();
        wrapper.vm.applyFilter();
        expect(addedFilters.value).toHaveLength(1);
        expect(addedFilters.value[0].value).toBe("closed");
    });

    scopedIt("removeFilter clears filter out", async () => {
        const state = reactive({ submittingValues: { status: [1] } });
        mockedUseForm.mockReturnValue({ state });
        const { wrapper, addedFilters } = mountComponent();
        wrapper.vm.applyFilter();

        expect(addedFilters.value).toHaveLength(1);
        wrapper.vm.removeFilter();
        await nextTick();
        expect(addedFilters.value).toHaveLength(0);
    });
});
