import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";

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

const mockedUseSlotNameResolver = vi.fn(() => ({ name: "slot" }));
vi.mock("@vueda/use/useSlotNameResolver.js", () => ({ useSlotNameResolver: mockedUseSlotNameResolver }));

const themeFn = vi.fn(() => "t");
const mockedUseTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));

const route = { query: {} };
vi.mock("vue-router", () => ({ useRoute: () => route }));

let FilterComponent;

beforeEach(async () => {
    FilterComponent = (await import("@vueda/components/FilterComponent.vue")).default;
    popoverToggle = undefined;
    popoverHide = undefined;
    mockedUseSlotNameResolver.mockClear();
    mockedUseTheme.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

function mountComponent(options = {}) {
    const addedFilters = ref([]);
    const wrapper = mount(FilterComponent, {
        props: {
            filterName: "status",
            index: 0,
            filterDetails: { label: "Status", lookupExprs: ["exact"] },
            params: {},
            filterFormValues: { name: "status", value: "open" },
            modelValue: addedFilters.value,
            "onUpdate:modelValue": (v) => (addedFilters.value = v),
            ...options.props,
        },
        global: {
            stubs: { Button: ButtonStub, ButtonGroup: ButtonGroupStub, Popover: PopoverStub },
        },
    });
    return { wrapper, addedFilters };
}

describe("lib/components/FilterComponent.vue", () => {
    scopedIt("doToggle toggles show state and calls popover", () => {
        const { wrapper } = mountComponent();
        const event = { preventDefault: vi.fn() };
        expect(wrapper.vm.internalShowState).toBe(false);
        wrapper.vm.doToggle(event);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(wrapper.vm.internalShowState).toBe(true);
        expect(popoverToggle).toHaveBeenCalledWith(event);
    });

    scopedIt("applyFilter adds and updates filter", async () => {
        const { wrapper, addedFilters } = mountComponent();
        wrapper.vm.applyFilter();
        expect(addedFilters.value).toHaveLength(1);
        expect(addedFilters.value[0].value).toBe("open");
        expect(wrapper.vm.computedFilterLabel).toBe("Status | open");
        expect(popoverHide).toHaveBeenCalled();
        expect(wrapper.emitted()["hide-filter-form"][0]).toEqual(["status"]);

        await wrapper.setProps({ filterFormValues: { name: "status", value: "closed" } });
        await nextTick();
        wrapper.vm.applyFilter();
        expect(addedFilters.value).toHaveLength(1);
        expect(addedFilters.value[0].value).toBe("closed");
    });

    scopedIt("applyFilter removes filter when value cleared", async () => {
        const { wrapper, addedFilters } = mountComponent();
        wrapper.vm.applyFilter();
        expect(addedFilters.value).toHaveLength(1);
        await wrapper.setProps({ filterFormValues: { name: "status", value: "" } });
        await nextTick();
        wrapper.vm.applyFilter();
        expect(addedFilters.value).toHaveLength(0);
    });
});
