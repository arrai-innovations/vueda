import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["variant"],
    inheritAttrs: false,
    emits: ["click"],
    setup(_, { emit, slots, attrs }) {
        return () => h("button", { ...attrs, onClick: () => emit("click") }, slots.default?.());
    },
});

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: (k) => k });

vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
    mergeTheme: (...themes) => Object.assign({}, ...themes),
}));

let ConstraintsBar;

const slots = {
    filters: () => h("div", { "data-qa": "slot-filters" }, "filters"),
    sort: () => h("div", { "data-qa": "slot-sort" }, "sort"),
};

beforeEach(async () => {
    ConstraintsBar = (await import("@vueda/components/ConstraintsBar.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
});

const openState = (wrapper) => wrapper.get('[data-qa="constraints-bar"]').attributes("data-open");

describe("lib/components/ConstraintsBar.vue", () => {
    scopedIt("renders the filters and sort slots", () => {
        const wrapper = mount(ConstraintsBar, {
            props: { filtersActive: true, sortsActive: true },
            slots,
        });
        expect(wrapper.find('[data-qa="slot-filters"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="slot-sort"]').exists()).toBe(true);
    });

    scopedIt("stays collapsed when no constraint is active", () => {
        const wrapper = mount(ConstraintsBar, {
            props: { filtersActive: false, sortsActive: false },
            slots,
        });
        expect(openState(wrapper)).toBe("false");
    });

    scopedIt("opens when a constraint is active", () => {
        const wrapper = mount(ConstraintsBar, {
            props: { filtersActive: false, sortsActive: true },
            slots,
        });
        expect(openState(wrapper)).toBe("true");
    });

    scopedIt("shows the divider only when both groups are active", () => {
        const both = mount(ConstraintsBar, { props: { filtersActive: true, sortsActive: true }, slots });
        expect(both.find('[data-qa="constraints-bar-divider"]').exists()).toBe(true);
        const filtersOnly = mount(ConstraintsBar, { props: { filtersActive: true, sortsActive: false }, slots });
        expect(filtersOnly.find('[data-qa="constraints-bar-divider"]').exists()).toBe(false);
    });

    // Combined Clear all is temporarily suppressed pending UX feedback (each group
    // now owns its own clear). Skipped rather than removed so it can be restored
    // alongside the button, or deleted with it once the direction is confirmed.
    scopedIt.skip("emits clear-all when Clear all is pressed", async () => {
        const wrapper = mount(ConstraintsBar, { props: { filtersActive: true, sortsActive: false }, slots });
        await wrapper.get('[data-qa="constraints-clear"]').trigger("click");
        expect(wrapper.emitted("clear-all")).toHaveLength(1);
    });

    scopedIt("omits Clear all when nothing is active", () => {
        const wrapper = mount(ConstraintsBar, { props: { filtersActive: false, sortsActive: false }, slots });
        expect(wrapper.find('[data-qa="constraints-clear"]').exists()).toBe(false);
    });
});
