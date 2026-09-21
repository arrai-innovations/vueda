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
    props: ["field"],
    setup(props, { attrs }) {
        return () => h("div", { "data-qa": "table-header", "data-field": props.field?.name, ...attrs });
    },
});

vi.mock("@vueda/support/EmptyComponent.vue", () => ({ default: EmptyComponentStub }));
vi.mock("@vueda/objects-grid/ObjectsGridBodyCell.vue", () => ({ default: BodyCellStub }));
vi.mock("@vueda/objects-grid/ObjectsGridBodyCellSkeleton.vue", () => ({ default: BodyCellSkeletonStub }));
vi.mock("@vueda/objects-grid/ObjectsGridCardCell.vue", () => ({ default: CardCellStub }));
vi.mock("@vueda/objects-grid/ObjectsGridCardCellSkeleton.vue", () => ({ default: CardCellSkeletonStub }));
vi.mock("@vueda/objects-grid/ObjectsGridTableHeader.vue", () => ({ default: TableHeaderStub }));

const useSlotNameResolver = vi.fn(() => ({ name: "slot", stop: vi.fn() }));
vi.mock("@vueda/use/useSlotNameResolver.js", () => ({ useSlotNameResolver }));

describe("lib/objects-grid/ObjectsGrid.vue", () => {
    let ObjectsGrid, tableRef, themeFn;
    beforeEach(async () => {
        tableRef = ref(false);
        themeFn = vi.fn((k) => k);
        vi.doMock("@vueda/use/useTheme.js", () => ({ useTheme: vi.fn(() => themeFn), THEME_OVERRIDE_PROPS: {} }));
        vi.doMock("@vueuse/core", () => ({ useBreakpoints: vi.fn(() => ({ greaterOrEqual: vi.fn(() => tableRef) })) }));
        ObjectsGrid = (await import("@vueda/objects-grid/ObjectsGrid.vue")).default;
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

    describe("empty state", () => {
        scopedIt("renders default body with emptyText as title", () => {
            const wrapper = mount(ObjectsGrid, {
                props: { fields: [{ name: "a" }], objectsInOrder: [], emptyText: "Nothing here." },
            });
            const empty = wrapper.find('[data-qa="objects-grid-body-row-group-empty"]');
            expect(empty.exists()).toBe(true);
            expect(empty.find("strong").text()).toBe("Nothing here.");
        });

        scopedIt("suppresses the empty row when emptyText is null and no slot is provided", () => {
            const wrapper = mount(ObjectsGrid, {
                props: { fields: [{ name: "a" }], objectsInOrder: [], emptyText: null },
            });
            expect(wrapper.find('[data-qa="objects-grid-body-row-group-empty"]').exists()).toBe(false);
        });

        scopedIt("forwards emptyVariant as data-variant on the content wrapper", () => {
            const wrapper = mount(ObjectsGrid, {
                props: { fields: [{ name: "a" }], objectsInOrder: [], emptyVariant: "loading" },
            });
            const content = wrapper.find('[data-qa="objects-grid-body-row-group-empty"] [data-variant]');
            expect(content.attributes("data-variant")).toBe("loading");
        });

        scopedIt("default-named empty slot replaces the default body", () => {
            const wrapper = mount(ObjectsGrid, {
                props: { fields: [{ name: "a" }], objectsInOrder: [], emptyText: "fallback" },
                slots: { empty: '<span data-qa="custom-empty">Custom empty body</span>' },
            });
            expect(wrapper.find('[data-qa="custom-empty"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="objects-grid-body-row-group-empty"] strong').exists()).toBe(false);
        });

        scopedIt("renders the empty row when only the empty slot is provided (no emptyText)", () => {
            const wrapper = mount(ObjectsGrid, {
                props: { fields: [{ name: "a" }], objectsInOrder: [], emptyText: null },
                slots: { empty: '<span data-qa="custom-empty">Custom</span>' },
            });
            expect(wrapper.find('[data-qa="custom-empty"]').exists()).toBe(true);
        });

        describe("spanning the grid width", () => {
            // The row is a `display: table-row` in table layout, so only a real `td` with
            // `colspan` reaches across the columns; a div became a first-column cell.
            scopedIt("renders a td spanning every column in table layout", async () => {
                tableRef.value = true;
                const wrapper = mount(ObjectsGrid, {
                    props: {
                        fields: [{ name: "a" }, { name: "b" }, { name: "c" }],
                        objectsInOrder: [],
                        emptyText: "Nothing here.",
                    },
                });
                await nextTick();
                const cell = wrapper.find('[data-qa="objects-grid-empty"]');
                expect(cell.element.tagName).toBe("TD");
                expect(cell.attributes("colspan")).toBe("3");
                expect(cell.attributes("aria-colspan")).toBe("3");
                expect(cell.attributes("role")).toBe("cell");
            });

            scopedIt("counts only the columns that render, skipping a field with no name", async () => {
                tableRef.value = true;
                const wrapper = mount(ObjectsGrid, {
                    props: { fields: [{ name: "a" }, {}, { name: "c" }], objectsInOrder: [] },
                });
                await nextTick();
                expect(wrapper.find('[data-qa="objects-grid-empty"]').attributes("colspan")).toBe("2");
            });

            scopedIt("spans at least one column when no field has a name", async () => {
                tableRef.value = true;
                const wrapper = mount(ObjectsGrid, { props: { fields: [{}], objectsInOrder: [] } });
                await nextTick();
                expect(wrapper.find('[data-qa="objects-grid-empty"]').attributes("colspan")).toBe("1");
            });

            // Card layout is correct as it stands: the row is a grid item, so `col-span-full`
            // on it is the right utility and a colspan would mean nothing.
            scopedIt("keeps a plain div with no colspan in card layout", () => {
                const wrapper = mount(ObjectsGrid, {
                    props: { fields: [{ name: "a" }, { name: "b" }], objectsInOrder: [] },
                });
                const cell = wrapper.find('[data-qa="objects-grid-empty"]');
                expect(cell.element.tagName).toBe("DIV");
                expect(cell.attributes("colspan")).toBeUndefined();
                expect(cell.attributes("aria-colspan")).toBeUndefined();
            });

            scopedIt("swaps the cell element when the layout changes", async () => {
                const wrapper = mount(ObjectsGrid, {
                    props: { fields: [{ name: "a" }, { name: "b" }], objectsInOrder: [] },
                });
                expect(wrapper.find('[data-qa="objects-grid-empty"]').element.tagName).toBe("DIV");
                tableRef.value = true;
                await nextTick();
                const cell = wrapper.find('[data-qa="objects-grid-empty"]');
                expect(cell.element.tagName).toBe("TD");
                expect(cell.attributes("colspan")).toBe("2");
            });
        });

        scopedIt("renders the icon registered for the active variant via useIcons", async () => {
            const IconStub = defineComponent({
                name: "IconStub",
                props: ["tone"],
                setup(props) {
                    return () => h("i", { "data-qa": "registered-icon", "data-tone": props.tone });
                },
            });
            const { setIcons } = await import("@vueda/use/useIcons.js");
            setIcons({ ObjectsGrid: { error: { component: IconStub, props: { tone: "danger" } } } });
            const wrapper = mount(ObjectsGrid, {
                props: { fields: [{ name: "a" }], objectsInOrder: [], emptyVariant: "error" },
            });
            const icon = wrapper.find('[data-qa="registered-icon"]');
            expect(icon.exists()).toBe(true);
            expect(icon.attributes("data-slot")).toBe("icon");
            expect(icon.attributes("data-tone")).toBe("danger");
        });
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
