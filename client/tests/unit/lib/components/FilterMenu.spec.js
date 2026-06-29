import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";

// The responsive shell and the field list are tested in their own specs; here we
// stub them and verify FilterMenu's own job: computing the not-yet-applied options
// and drilling into the picked field's form (with a back affordance).
const ResponsiveMenuStub = defineComponent({
    name: "ResponsiveMenuStub",
    props: ["icon", "label", "title", "triggerTarget", "triggerQa", "contentQa", "open"],
    emits: ["update:open"],
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "responsive-menu" }, slots.default ? slots.default() : null);
    },
});

const FieldPickerMenuListStub = defineComponent({
    name: "FieldPickerMenuListStub",
    props: ["items", "eyebrow", "emptyText", "itemIcon", "qa"],
    emits: ["pick"],
    setup(props, { emit }) {
        return () =>
            h(
                "div",
                { "data-qa": "field-picker" },
                props.items.map((opt) =>
                    h("button", { "data-qa": `${props.qa}-item`, onClick: () => emit("pick", opt.value) }, opt.label),
                ),
            );
    },
});

const FilterFieldFormStub = defineComponent({
    name: "FilterFieldFormStub",
    props: ["filterName", "filterDetails", "query", "open", "showRemove"],
    setup(props) {
        return () => h("div", { "data-qa": "filter-field-form", "data-field": props.filterName });
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

vi.mock("@vueda/components/ResponsiveMenu.vue", () => ({ default: ResponsiveMenuStub }));
vi.mock("@vueda/components/FieldPickerMenuList.vue", () => ({ default: FieldPickerMenuListStub }));
vi.mock("@vueda/components/FilterFieldForm.vue", () => ({ default: FilterFieldFormStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
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
    scopedIt("offers only the not-yet-applied fields, labeled", () => {
        const { wrapper } = mountMenu({ addedFilters: [{ field: "a" }] });
        expect(wrapper.findComponent(FieldPickerMenuListStub).props("items")).toEqual([
            { value: "b", label: "B" },
            { value: "c", label: "C" },
        ]);
    });

    scopedIt("drills into a field's form when picked, and returns via back", async () => {
        const { wrapper } = mountMenu();
        expect(wrapper.find('[data-qa="filter-field-form"]').exists()).toBe(false);

        await wrapper.findAll('[data-qa="filter-menu-item"]')[0].trigger("click");
        await nextTick();
        const form = wrapper.get('[data-qa="filter-field-form"]');
        expect(form.attributes("data-field")).toBe("a");
        // The list is replaced by the drill-in while a field is picked.
        expect(wrapper.findComponent(FieldPickerMenuListStub).exists()).toBe(false);

        await wrapper.get('[data-qa="filter-menu-back"]').trigger("click");
        await nextTick();
        expect(wrapper.find('[data-qa="filter-field-form"]').exists()).toBe(false);
        expect(wrapper.findComponent(FieldPickerMenuListStub).props("items")).toHaveLength(3);
    });

    scopedIt("passes an empty option set to the list when every field is applied", () => {
        const { wrapper } = mountMenu({ addedFilters: [{ field: "a" }, { field: "b" }, { field: "c" }] });
        expect(wrapper.findComponent(FieldPickerMenuListStub).props("items")).toHaveLength(0);
    });
});
