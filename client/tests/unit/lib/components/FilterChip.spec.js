import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";

const PassThroughStub = (name, qa) =>
    defineComponent({
        name,
        setup(_, { slots }) {
            return () => h("div", qa ? { "data-qa": qa } : {}, slots.default ? slots.default() : null);
        },
    });

const FilterFieldFormStub = defineComponent({
    name: "FilterFieldFormStub",
    props: ["filterName", "filterDetails", "query", "errored", "showRemove", "open"],
    setup() {
        return () => h("div", { "data-qa": "filter-field-form" });
    },
});

vi.mock("@vueda/components/FilterFieldForm.vue", () => ({ default: FilterFieldFormStub }));
vi.mock("@vueda/shell/popover/Popover.vue", () => ({ default: PassThroughStub("PopoverStub") }));
vi.mock("@vueda/shell/popover/PopoverContent.vue", () => ({
    default: PassThroughStub("PopoverContentStub", "popover-content"),
}));
vi.mock("@vueda/shell/popover/PopoverTrigger.vue", () => ({ default: PassThroughStub("PopoverTriggerStub") }));

const mockedUseModelChoices = vi.fn(() => ({ choices: {} }));
vi.mock("@vueda/use/useModelChoices.js", () => ({ useModelChoices: mockedUseModelChoices }));
vi.mock("@vueda/use/useIcons.js", () => ({ useIcons: () => () => null }));

const { makeThemeFn, makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const themeFn = makeThemeFn({ slotResolver: () => "t" });
const mockedUseTheme = makeUseThemeMock({ themeFn });
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
    mergeTheme: (...themes) => Object.assign({}, ...themes),
}));

let FilterChip;

beforeEach(async () => {
    FilterChip = (await import("@vueda/components/FilterChip.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
});

function mountChip(options = {}) {
    const addedFilters = ref(options.addedFilters ?? [{ field: "status", value: "open" }]);
    const wrapper = mount(FilterChip, {
        props: {
            filter: { field: "status", value: "open" },
            filterDetails: { label: "Status" },
            modelValue: addedFilters.value,
            "onUpdate:modelValue": (v) => (addedFilters.value = v),
            ...options.props,
        },
    });
    return { wrapper, addedFilters };
}

describe("lib/components/FilterChip.vue", () => {
    scopedIt("renders the field label and value", () => {
        const { wrapper } = mountChip();
        expect(wrapper.get('[data-qa="filter-chip-edit"]').text()).toContain("Status: open");
    });

    scopedIt("resolves a choice value to its label", () => {
        const { wrapper } = mountChip({
            props: {
                filter: { field: "status", value: 2 },
                filterDetails: { label: "Status", choices: [{ value: 2, label: "Active" }] },
            },
        });
        expect(wrapper.get('[data-qa="filter-chip-edit"]').text()).toContain("Status: Active");
    });

    scopedIt("removes the filter from the shared list when the remove control is clicked", async () => {
        const { wrapper, addedFilters } = mountChip();
        await wrapper.get('[data-qa="filter-chip-remove"]').trigger("click");
        await nextTick();
        expect(addedFilters.value).toHaveLength(0);
    });

    scopedIt("flags the destructive state via data-errored", () => {
        const { wrapper } = mountChip({ props: { errored: true } });
        expect(wrapper.get('[data-qa="filter-chip"]').attributes("data-errored")).toBe("true");
    });
});
