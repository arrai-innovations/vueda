import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const SortChipStub = defineComponent({
    name: "SortChipStub",
    props: ["field", "index", "fieldDetails"],
    emits: ["toggle", "remove"],
    setup(props, { emit }) {
        return () =>
            h("div", { "data-qa": "sort-chip", "data-field": props.field, "data-index": props.index }, [
                h("button", { "data-qa": "stub-toggle", onClick: () => emit("toggle") }),
                h("button", { "data-qa": "stub-remove", onClick: () => emit("remove") }),
            ]);
    },
});

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["variant"],
    inheritAttrs: false,
    emits: ["click"],
    setup(props, { emit, slots, attrs }) {
        return () => h("button", { ...attrs, onClick: () => emit("click") }, slots.default?.());
    },
});

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: (k) => k });

vi.mock("@vueda/components/SortChip.vue", () => ({ default: SortChipStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
    mergeTheme: (...themes) => Object.assign({}, ...themes),
}));

let SortGroup;

beforeEach(async () => {
    SortGroup = (await import("@vueda/components/SortGroup.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
});

describe("lib/components/SortGroup.vue", () => {
    scopedIt("renders one chip per sort entry, in order", () => {
        const wrapper = mount(SortGroup, { props: { sorted: ["-updated", "mrr"] } });
        const chips = wrapper.findAll('[data-qa="sort-chip"]');
        expect(chips).toHaveLength(2);
        expect(chips[0].attributes("data-field")).toBe("-updated");
        expect(chips[0].attributes("data-index")).toBe("0");
        expect(chips[1].attributes("data-field")).toBe("mrr");
        expect(chips[1].attributes("data-index")).toBe("1");
    });

    scopedIt("renders nothing when no sort is active", () => {
        const wrapper = mount(SortGroup, { props: { sorted: [] } });
        expect(wrapper.find('[data-qa="sort-group-strip"]').exists()).toBe(false);
    });

    scopedIt("toggles a field's direction in place, preserving the others", async () => {
        const wrapper = mount(SortGroup, { props: { sorted: ["-updated", "mrr"] } });
        await wrapper.findAll('[data-qa="stub-toggle"]')[0].trigger("click");
        expect(wrapper.emitted("update:sorted")[0][0]).toEqual(["updated", "mrr"]);
    });

    scopedIt("removes a field by base, keeping the rest", async () => {
        const wrapper = mount(SortGroup, { props: { sorted: ["-updated", "mrr"] } });
        await wrapper.findAll('[data-qa="stub-remove"]')[0].trigger("click");
        expect(wrapper.emitted("update:sorted")[0][0]).toEqual(["mrr"]);
    });

    scopedIt("clears every sort field", async () => {
        const wrapper = mount(SortGroup, { props: { sorted: ["-updated", "mrr"] } });
        await wrapper.get('[data-qa="sort-clear"]').trigger("click");
        expect(wrapper.emitted("update:sorted")[0][0]).toEqual([]);
    });
});
