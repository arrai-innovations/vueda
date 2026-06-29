import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

vi.mock("@vueda/use/useIcons.js", () => ({ useIcons: () => () => null }));

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: (key) => key });
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
    mergeTheme: (...themes) => Object.assign({}, ...themes),
}));

let FieldPickerMenuList;

beforeEach(async () => {
    FieldPickerMenuList = (await import("@vueda/components/FieldPickerMenuList.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
});

const items = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
];

describe("lib/components/FieldPickerMenuList.vue", () => {
    scopedIt("renders one row per item, labeled, under a qa namespace", () => {
        const wrapper = mount(FieldPickerMenuList, { props: { items, eyebrow: "Add sort", qa: "sort-add-menu" } });
        const rows = wrapper.findAll('[data-qa="sort-add-menu-item"]');
        expect(rows.map((row) => row.text())).toEqual(["Alpha", "Beta"]);
    });

    scopedIt("emits pick with the field value when a row is clicked", async () => {
        const wrapper = mount(FieldPickerMenuList, { props: { items, qa: "sort-add-menu" } });
        await wrapper.findAll('[data-qa="sort-add-menu-item"]')[1].trigger("click");
        expect(wrapper.emitted("pick")[0][0]).toBe("b");
    });

    scopedIt("shows the empty state with no items", () => {
        const wrapper = mount(FieldPickerMenuList, {
            props: { items: [], emptyText: "All fields sorted.", qa: "sort-add-menu" },
        });
        expect(wrapper.findAll('[data-qa="sort-add-menu-item"]')).toHaveLength(0);
        const empty = wrapper.get('[data-qa="sort-add-menu-empty"]');
        expect(empty.text()).toBe("All fields sorted.");
    });
});
