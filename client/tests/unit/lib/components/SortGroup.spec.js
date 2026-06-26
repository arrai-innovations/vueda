import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, reactive } from "vue";

const SortChipStub = defineComponent({
    name: "SortChipStub",
    props: ["field", "index", "fieldDetails", "showOrdinal"],
    emits: ["toggle", "remove"],
    setup(props, { emit }) {
        return () =>
            h(
                "div",
                {
                    "data-qa": "sort-chip",
                    "data-field": props.field,
                    "data-index": props.index,
                    "data-show-ordinal": String(props.showOrdinal),
                },
                [
                    h("button", { "data-qa": "stub-toggle", onClick: () => emit("toggle") }),
                    h("button", { "data-qa": "stub-remove", onClick: () => emit("remove") }),
                ],
            );
    },
});

// Stub the drag wrapper without standing up Sortable. It renders its chips through
// the default slot and exposes `simulateMove` to mimic an in-place reorder of the
// `list` prop (as the real wrapper does) before firing `change`.
const DraggableStub = defineComponent({
    name: "DraggableStub",
    props: ["list"],
    emits: ["change", "start", "end"],
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "sort-group-draggable" }, slots.default ? slots.default() : null);
    },
});

// Mimic the real wrapper: splice the `list` prop in place (moving `from` to `to`),
// then fire `change`. The array is SortGroup's own `localSorted`, so the mutation
// is what the host renders from.
const simulateMove = (drag, from, to) => {
    const list = drag.props("list");
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    drag.vm.$emit("change");
};

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
vi.mock("vue-draggable-next", () => ({ VueDraggableNext: DraggableStub }));
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

    scopedIt("shows chip ordinals only when more than one sort is active", () => {
        const single = mount(SortGroup, { props: { sorted: ["-updated"] } });
        expect(single.find('[data-qa="sort-chip"]').attributes("data-show-ordinal")).toBe("false");

        const many = mount(SortGroup, { props: { sorted: ["-updated", "mrr"] } });
        expect(many.findAll('[data-qa="sort-chip"]')[0].attributes("data-show-ordinal")).toBe("true");
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

    scopedIt("re-emits the reordered sort after the drag wrapper moves a chip", async () => {
        const wrapper = mount(SortGroup, { props: { sorted: ["-updated", "mrr"] } });
        simulateMove(wrapper.findComponent(DraggableStub), 0, 1);
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted("update:sorted")[0][0]).toEqual(["mrr", "-updated"]);
    });

    scopedIt("reflects in-place mutations of the sorted prop (no reference change)", async () => {
        // useViewList mutates sorting.state.sorted in place, so the prop array's
        // reference is stable; the chips must still update.
        const sorted = reactive(["-updated"]);
        const wrapper = mount(SortGroup, { props: { sorted } });
        expect(wrapper.findAll('[data-qa="sort-chip"]')).toHaveLength(1);

        sorted.push("mrr");
        await nextTick();
        const fields = wrapper.findAll('[data-qa="sort-chip"]').map((chip) => chip.attributes("data-field"));
        expect(fields).toEqual(["-updated", "mrr"]);
    });

    scopedIt("renders a newly added sort last, even after a reorder", async () => {
        const wrapper = mount(SortGroup, { props: { sorted: ["a", "b", "c"] } });
        // Reorder, then the host appends a fourth field (as SortControl's add menu does).
        simulateMove(wrapper.findComponent(DraggableStub), 2, 0);
        await wrapper.vm.$nextTick();
        await wrapper.setProps({ sorted: ["c", "a", "b", "d"] });
        await wrapper.vm.$nextTick();
        const fields = wrapper.findAll('[data-qa="sort-chip"]').map((chip) => chip.attributes("data-field"));
        expect(fields).toEqual(["c", "a", "b", "d"]);
    });

    scopedIt("marks the row dragging only while a drag is in progress", async () => {
        const wrapper = mount(SortGroup, { props: { sorted: ["-updated", "mrr"] } });
        const drag = wrapper.findComponent(DraggableStub);
        const row = () => wrapper.get('[data-qa="sort-group-draggable"]');
        expect(row().classes()).not.toContain("dragging");

        drag.vm.$emit("start");
        await wrapper.vm.$nextTick();
        expect(row().classes()).toContain("dragging");

        drag.vm.$emit("end");
        await wrapper.vm.$nextTick();
        expect(row().classes()).not.toContain("dragging");
    });

    scopedIt("offers Clear all only with more than one sort", async () => {
        const single = mount(SortGroup, { props: { sorted: ["-updated"] } });
        expect(single.find('[data-qa="sort-group-strip"]').exists()).toBe(true);
        expect(single.find('[data-qa="sort-clear"]').exists()).toBe(false);

        const many = mount(SortGroup, { props: { sorted: ["-updated", "mrr"] } });
        await many.get('[data-qa="sort-clear"]').trigger("click");
        expect(many.emitted("update:sorted")[0][0]).toEqual([]);
    });
});
