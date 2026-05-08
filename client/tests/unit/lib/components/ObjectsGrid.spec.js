import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";

const EmptyComponentStub = defineComponent({
    name: "EmptyComponentStub",
    setup(_, { slots, attrs }) {
        return () => h("div", { "data-qa": "empty", ...attrs }, slots.default ? slots.default() : null);
    },
});
const BodyCellStub = defineComponent({
    name: "BodyCellStub",
    props: ["field"],
    setup(props, { attrs }) {
        return () => h("div", { "data-qa": "body-cell", "data-field": props.field?.name, ...attrs });
    },
});
const BodyCellSkeletonStub = defineComponent({
    name: "BodyCellSkeletonStub",
    props: ["field"],
    setup(props) {
        return () => h("div", { "data-qa": "body-cell-skeleton", "data-field": props.field?.name });
    },
});
const CardCellStub = defineComponent({
    name: "CardCellStub",
    props: ["field"],
    setup(props, { attrs }) {
        return () => h("div", { "data-qa": "card-cell", "data-field": props.field?.name, ...attrs });
    },
});
const CardCellSkeletonStub = defineComponent({
    name: "CardCellSkeletonStub",
    props: ["field"],
    setup(props) {
        return () => h("div", { "data-qa": "card-cell-skeleton", "data-field": props.field?.name });
    },
});
const TableHeaderStub = defineComponent({
    name: "TableHeaderStub",
    props: ["field", "ascending", "descending", "sortable"],
    setup(props, { attrs }) {
        return () => h("div", { "data-qa": "table-header", "data-field": props.field?.name, ...attrs });
    },
});

vi.mock("@vueda/components/EmptyComponent.vue", () => ({ default: EmptyComponentStub }));
vi.mock("@vueda/components/ObjectsGridBodyCell.vue", () => ({ default: BodyCellStub }));
vi.mock("@vueda/components/ObjectsGridBodyCellSkeleton.vue", () => ({ default: BodyCellSkeletonStub }));
vi.mock("@vueda/components/ObjectsGridCardCell.vue", () => ({ default: CardCellStub }));
vi.mock("@vueda/components/ObjectsGridCardCellSkeleton.vue", () => ({ default: CardCellSkeletonStub }));
vi.mock("@vueda/components/ObjectsGridTableHeader.vue", () => ({ default: TableHeaderStub }));

const useSlotNameResolver = vi.fn(() => ({ name: "slot", stop: vi.fn() }));
vi.mock("@vueda/use/useSlotNameResolver.js", () => ({ useSlotNameResolver }));

describe("lib/components/ObjectsGrid.vue", () => {
    let ObjectsGrid, tableRef, themeFn;
    beforeEach(async () => {
        tableRef = ref(false);
        themeFn = vi.fn((k) => k);
        vi.doMock("@vueda/use/useTheme.js", () => ({ useTheme: vi.fn(() => themeFn), THEME_OVERRIDE_PROPS: {} }));
        vi.doMock("@vueuse/core", () => ({ useBreakpoints: vi.fn(() => ({ greaterOrEqual: vi.fn(() => tableRef) })) }));
        ObjectsGrid = (await import("@vueda/components/ObjectsGrid.vue")).default;
    });
    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    scopedIt("emits update:isTable on mount and breakpoint change", async () => {
        const wrapper = mount(ObjectsGrid, { props: { fields: [{ name: "a" }], objectsInOrder: [] } });
        expect(wrapper.emitted()["update:isTable"][0]).toEqual([false]);
        tableRef.value = true;
        await nextTick();
        expect(wrapper.emitted()["update:isTable"][1]).toEqual([true]);
    });

    scopedIt("sortClick toggles sorting without ctrl", async () => {
        const wrapper = mount(ObjectsGrid, {
            props: { fields: [{ name: "a" }], sortables: ["a"], sorted: [], objectsInOrder: [] },
        });
        wrapper.vm.sortClick({ ctrlKey: false }, "a");
        expect(wrapper.emitted()["update:sorted"][0]).toEqual([["a"]]);
        await wrapper.setProps({ sorted: ["a"] });
        await nextTick();
        wrapper.vm.sortClick({ ctrlKey: false }, "a");
        expect(wrapper.emitted()["update:sorted"][1]).toEqual([["-a"]]);
    });

    scopedIt("sortClick handles multi-sort with ctrl", async () => {
        const wrapper = mount(ObjectsGrid, {
            props: {
                fields: [{ name: "a" }, { name: "b" }],
                sortables: ["a", "b"],
                sorted: ["a"],
                objectsInOrder: [],
            },
        });
        wrapper.vm.sortClick({ ctrlKey: true }, "b");
        expect(wrapper.emitted()["update:sorted"][0]).toEqual([["a", "b"]]);
        await wrapper.setProps({ sorted: ["a", "b"] });
        await nextTick();
        wrapper.vm.sortClick({ ctrlKey: true }, "b");
        expect(wrapper.emitted()["update:sorted"][1]).toEqual([["a"]]);
        await wrapper.setProps({ sorted: ["a"] });
        await nextTick();
        wrapper.vm.sortClick({ ctrlKey: true }, "a");
        expect(wrapper.emitted()["update:sorted"][2]).toEqual([["-a"]]);
    });

    scopedIt("renders skeleton when loading with no data", () => {
        const wrapper = mount(ObjectsGrid, {
            props: { fields: [{ name: "a" }], loading: true, objectsInOrder: [], skeletonRows: 2 },
        });
        expect(wrapper.findAll('[data-qa="card-cell-skeleton"]').length).toBe(2);
    });

    scopedIt("renders card then table cells when breakpoint changes", async () => {
        const wrapper = mount(ObjectsGrid, {
            props: { fields: [{ name: "a" }], objectsInOrder: [{ id: 1, a: "v" }], pkKey: "id" },
        });
        expect(wrapper.findAll('[data-qa="card-cell"]').length).toBe(1);
        tableRef.value = true;
        await nextTick();
        expect(wrapper.findAll('[data-qa="body-cell"]').length).toBe(1);
    });

    describe("density prop", () => {
        scopedIt("defaults data-density to 'default' on the root", () => {
            const wrapper = mount(ObjectsGrid, { props: { fields: [{ name: "a" }], objectsInOrder: [] } });
            expect(wrapper.find('[data-qa="objects-grid-root"]').attributes("data-density")).toBe("default");
        });

        scopedIt.each(["default", "compact", "condensed"])(
            "forwards density=%s as data-density on the root",
            (density) => {
                const wrapper = mount(ObjectsGrid, {
                    props: { fields: [{ name: "a" }], objectsInOrder: [], density },
                });
                expect(wrapper.find('[data-qa="objects-grid-root"]').attributes("data-density")).toBe(density);
            },
        );
    });

    describe("data-numeric forwarding", () => {
        scopedIt("sets data-numeric on the header cell when field.numeric is true", () => {
            tableRef.value = true;
            const wrapper = mount(ObjectsGrid, {
                props: { fields: [{ name: "qty", numeric: true }], objectsInOrder: [] },
            });
            expect(wrapper.find('[data-qa="objects-grid-header"]').attributes("data-numeric")).toBe("true");
        });

        scopedIt("omits data-numeric on the header cell when field.numeric is falsy", () => {
            tableRef.value = true;
            const wrapper = mount(ObjectsGrid, {
                props: { fields: [{ name: "qty" }], objectsInOrder: [] },
            });
            expect(wrapper.find('[data-qa="objects-grid-header"]').attributes("data-numeric")).toBeUndefined();
        });

        scopedIt("forwards data-numeric to body cells in table mode when field.numeric is true", async () => {
            tableRef.value = true;
            const wrapper = mount(ObjectsGrid, {
                props: {
                    fields: [{ name: "qty", numeric: true }],
                    objectsInOrder: [{ id: 1, qty: 5 }],
                    pkKey: "id",
                },
            });
            await nextTick();
            expect(wrapper.find('[data-qa="body-cell"]').attributes("data-numeric")).toBe("true");
        });
    });
});
