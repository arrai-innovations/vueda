import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

const { makeThemeFn, makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const themeFn = makeThemeFn({ slotResolver: (k) => `theme-${k}` });
const mockedUseTheme = makeUseThemeMock({ themeFn });
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
}));

let vue;
const mockedUseObjectGridCell = vi.fn();
vi.mock("@vueda/use/useObjectGridCell.js", () => ({
    useObjectGridCell: (...args) => mockedUseObjectGridCell(...args),
}));

describe("lib/objects-grid/ObjectsGridCardCell.vue", () => {
    let ObjectsGridCardCell;

    beforeEach(async () => {
        vue = await vi.importActual("vue");
        ObjectsGridCardCell = (await import("@vueda/objects-grid/ObjectsGridCardCell.vue")).default;
        mockedUseTheme.mockClear();
        mockedUseObjectGridCell.mockReset();
        mockedUseObjectGridCell.mockReturnValue({
            formattedComputed: vue.computed(() => "formatted"),
            valueComputed: vue.computed(() => "value"),
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("renders default slots with theme classes", () => {
        const wrapper = mount(ObjectsGridCardCell, {
            props: {
                field: { name: "foo", label: "Foo" },
                obj: { id: 42 },
                relatedObject: {},
                calculatedObject: {},
                rowIndex: 0,
                columnIndex: 0,
                rowCount: 1,
                columnCount: 1,
                headerClass: "extra",
            },
            attrs: { class: "outer" },
        });

        const header = wrapper.get('[data-card-header="foo"]');
        expect(header.text()).toBe("Foo");
        expect(header.classes()).toEqual(expect.arrayContaining(["theme-header", "extra"]));

        const value = wrapper.get('[data-card="foo"]');
        expect(value.text()).toBe("formatted");
        expect(value.classes()).toEqual(expect.arrayContaining(["theme-value", "outer"]));

        expect(wrapper.vm.uniqueKeyForSlot).toBe("foo-42");
        expect(mockedUseTheme).toHaveBeenCalledWith("ObjectsGridCardCell", expect.any(Object), expect.any(Object));
        expect(mockedUseObjectGridCell).toHaveBeenCalled();
    });

    scopedIt("falls back to row/column indexes when pk unavailable", () => {
        const wrapper = mount(ObjectsGridCardCell, {
            props: {
                field: { name: "foo", label: "Foo" },
                obj: {},
                relatedObject: {},
                calculatedObject: {},
                rowIndex: 2,
                columnIndex: 3,
                rowCount: 4,
                columnCount: 5,
            },
        });

        expect(wrapper.vm.uniqueKeyForSlot).toBe("col-3-row-2");
    });
});
