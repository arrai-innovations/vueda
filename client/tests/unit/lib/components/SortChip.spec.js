import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

const { makeThemeFn, makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const themeFn = makeThemeFn({ slotResolver: (k) => k });
const mockedUseTheme = makeUseThemeMock({ themeFn });
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
    mergeTheme: (...themes) => Object.assign({}, ...themes),
}));
// No registered icons: the SFC falls back to the unicode direction triangles and `×`.
vi.mock("@vueda/use/useIcons.js", () => ({ ICON_OVERRIDE_PROPS: {}, useIcons: () => () => null }));

let SortChip;

beforeEach(async () => {
    SortChip = (await import("@vueda/components/SortChip.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
});

describe("lib/components/SortChip.vue", () => {
    scopedIt("renders the priority ordinal, the start-cased label, and the descending glyph", () => {
        const wrapper = mount(SortChip, { props: { field: "-updated", index: 0, fieldDetails: {} } });
        expect(wrapper.get('[data-qa="sort-chip-ordinal"]').text()).toBe("1");
        expect(wrapper.text()).toContain("Updated");
        expect(wrapper.text()).toContain("↓");
        expect(wrapper.get('[data-qa="sort-chip-toggle"]').attributes("aria-label")).toContain("currently descending");
    });

    scopedIt("renders the ascending glyph for an unprefixed field and the 1-based ordinal", () => {
        const wrapper = mount(SortChip, { props: { field: "mrr", index: 1, fieldDetails: {} } });
        expect(wrapper.get('[data-qa="sort-chip-ordinal"]').text()).toBe("2");
        expect(wrapper.text()).toContain("↑");
        expect(wrapper.get('[data-qa="sort-chip-toggle"]').attributes("aria-label")).toContain("currently ascending");
    });

    scopedIt("shows the ordinal by default and hides it when showOrdinal is false", () => {
        const shown = mount(SortChip, { props: { field: "mrr", index: 0 } });
        expect(shown.find('[data-qa="sort-chip-ordinal"]').exists()).toBe(true);

        const hidden = mount(SortChip, { props: { field: "mrr", index: 0, showOrdinal: false } });
        expect(hidden.find('[data-qa="sort-chip-ordinal"]').exists()).toBe(false);
    });

    scopedIt("prefers the fieldDetails label over the start-cased base", () => {
        const wrapper = mount(SortChip, { props: { field: "mrr", index: 0, fieldDetails: { mrr: { label: "MRR" } } } });
        expect(wrapper.text()).toContain("MRR");
        expect(wrapper.text()).not.toContain("Mrr");
    });

    scopedIt("emits toggle when the label segment is clicked", async () => {
        const wrapper = mount(SortChip, { props: { field: "mrr", index: 0 } });
        await wrapper.get('[data-qa="sort-chip-toggle"]').trigger("click");
        expect(wrapper.emitted("toggle")).toHaveLength(1);
    });

    scopedIt("emits remove when the remove segment is clicked", async () => {
        const wrapper = mount(SortChip, { props: { field: "mrr", index: 0 } });
        await wrapper.get('[data-qa="sort-chip-remove"]').trigger("click");
        expect(wrapper.emitted("remove")).toHaveLength(1);
    });
});
