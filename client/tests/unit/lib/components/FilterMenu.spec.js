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

const ButtonStub = defineComponent({
    name: "ButtonStub",
    inheritAttrs: false,
    emits: ["click"],
    setup(_, { emit, slots, attrs }) {
        return () => h("button", { ...attrs, onClick: () => emit("click") }, slots.default ? slots.default() : null);
    },
});

const FilterFieldFormStub = defineComponent({
    name: "FilterFieldFormStub",
    props: ["filterName", "filterDetails", "query", "open", "showRemove"],
    setup(props) {
        return () => h("div", { "data-qa": "filter-field-form", "data-field": props.filterName });
    },
});

vi.mock("@vueda/components/FilterFieldForm.vue", () => ({ default: FilterFieldFormStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/shell/popover/Popover.vue", () => ({ default: PassThroughStub("PopoverStub") }));
vi.mock("@vueda/shell/popover/PopoverContent.vue", () => ({ default: PassThroughStub("PopoverContentStub") }));
vi.mock("@vueda/shell/popover/PopoverTrigger.vue", () => ({ default: PassThroughStub("PopoverTriggerStub") }));
vi.mock("@vueda/use/useIcons.js", () => ({ useIcons: () => () => null }));

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: () => "t" });
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
    mergeTheme: (...themes) => Object.assign({}, ...themes),
}));

let FilterMenu;

beforeEach(async () => {
    FilterMenu = (await import("@vueda/components/FilterMenu.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
});

function mountMenu(options = {}) {
    const addedFilters = ref(options.addedFilters ?? []);
    const wrapper = mount(FilterMenu, {
        props: {
            filterables: ["a", "b", "c"],
            filterableDetails: { a: { label: "A" }, b: { label: "B" }, c: { label: "C" } },
            modelValue: addedFilters.value,
            "onUpdate:modelValue": (v) => (addedFilters.value = v),
            ...options.props,
        },
    });
    return { wrapper, addedFilters };
}

describe("lib/components/FilterMenu.vue", () => {
    scopedIt("lists only the not-yet-applied fields", () => {
        const { wrapper } = mountMenu({ addedFilters: [{ field: "a" }] });
        const items = wrapper.findAll('[data-qa="filter-menu-item"]');
        expect(items).toHaveLength(2);
        expect(items.map((i) => i.text().trim())).toEqual(["B", "C"]);
    });

    scopedIt("does not render an active-filter count badge", () => {
        const { wrapper } = mountMenu({ addedFilters: [{ field: "a" }, { field: "b" }] });
        expect(wrapper.find('[data-qa="filter-menu-count"]').exists()).toBe(false);
    });

    scopedIt("drills into a field's form when picked, and returns via back", async () => {
        const { wrapper } = mountMenu();
        expect(wrapper.find('[data-qa="filter-field-form"]').exists()).toBe(false);

        await wrapper.findAll('[data-qa="filter-menu-item"]')[0].trigger("click");
        await nextTick();
        const form = wrapper.get('[data-qa="filter-field-form"]');
        expect(form.attributes("data-field")).toBe("a");

        await wrapper.get('[data-qa="filter-menu-back"]').trigger("click");
        await nextTick();
        expect(wrapper.find('[data-qa="filter-field-form"]').exists()).toBe(false);
        expect(wrapper.findAll('[data-qa="filter-menu-item"]')).toHaveLength(3);
    });

    scopedIt("shows an empty state when every field is applied", () => {
        const { wrapper } = mountMenu({ addedFilters: [{ field: "a" }, { field: "b" }, { field: "c" }] });
        expect(wrapper.find('[data-qa="filter-menu-empty"]').exists()).toBe(true);
        expect(wrapper.findAll('[data-qa="filter-menu-item"]')).toHaveLength(0);
    });
});
