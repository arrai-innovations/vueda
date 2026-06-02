import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

const { makeThemeFn, makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const themeFn = makeThemeFn({ slotResolver: (k) => `theme-${k}` });
const mockedUseTheme = makeUseThemeMock({ themeFn });
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));

let ObjectsGridTableHeader;

beforeEach(async () => {
    ObjectsGridTableHeader = (await import("@vueda/components/ObjectsGridTableHeader.vue")).default;
    mockedUseTheme.mockClear();
    themeFn.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

scopedIt("renders label slot and applies theme classes", () => {
    const captured = {};
    const wrapper = mount(ObjectsGridTableHeader, {
        props: { field: { name: "foo", label: "Foo" }, columnIndex: 1, columnCount: 3 },
        slots: {
            label: (slotProps) => {
                Object.assign(captured, slotProps);
                const { h } = require("vue");
                return h("span", { "data-qa": "label-slot" }, slotProps.field.label);
            },
        },
    });

    expect(mockedUseTheme).toHaveBeenCalledWith("ObjectsGridTableHeader", expect.any(Object), expect.any(Object));

    const root = wrapper.get('[data-qa="objects-grid-table-header-root"]');
    expect(root.classes()).toContain("theme-root");

    const label = wrapper.get('[data-qa="objects-grid-table-header-label"]');
    expect(label.classes()).toContain("theme-label");
    expect(wrapper.get('[data-qa="label-slot"]').text()).toBe("Foo");

    expect(captured.columnIndex).toBe(1);
    expect(captured.columnCount).toBe(3);
    expect(captured.field).toEqual({ name: "foo", label: "Foo" });
    expect(wrapper.vm.uniqueKeyForSlot).toBe("foo-1");
});

scopedIt("renders sort icon and multi sort number", () => {
    const wrapper = mount(ObjectsGridTableHeader, {
        props: {
            field: { name: "bar", label: "Bar" },
            columnIndex: 0,
            columnCount: 1,
            sortable: true,
            ascending: true,
            multiSortIndex: 2,
        },
    });

    const sortIcon = wrapper.get('[data-qa="objects-grid-table-header-sort-icon"]');
    expect(sortIcon.classes()).toContain("theme-sortIcon");
    expect(sortIcon.text()).toContain("⬆️");

    const multi = wrapper.get('[data-qa="objects-grid-table-header-multi-sort-number"]');
    expect(multi.text()).toBe("3");
});

scopedIt("computes fallback key when field has no name", () => {
    const wrapper = mount(ObjectsGridTableHeader, {
        props: { field: { label: "NoName" }, columnIndex: 2, columnCount: 4 },
    });
    expect(wrapper.vm.uniqueKeyForSlot).toBe("col-2");
});
