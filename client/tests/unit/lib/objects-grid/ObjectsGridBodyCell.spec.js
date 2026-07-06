import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { h } from "vue";

const { makeThemeFn, makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const themeFn = makeThemeFn({ slotResolver: (k) => `theme-${k}` });
const mockedUseTheme = makeUseThemeMock({ themeFn });
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
}));

const mockedUseObjectGridCell = vi.fn();
vi.mock("@vueda/use/useObjectGridCell.js", () => ({
    useObjectGridCell: mockedUseObjectGridCell,
}));

describe("lib/objects-grid/ObjectsGridBodyCell.vue", () => {
    let vue;
    let ObjectsGridBodyCell;

    beforeEach(async () => {
        vue = await vi.importActual("vue");
        ObjectsGridBodyCell = (await import("@vueda/objects-grid/ObjectsGridBodyCell.vue")).default;
        mockedUseTheme.mockClear();
        mockedUseObjectGridCell.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    function mountComponent(props = {}, options = {}) {
        const captured = {};
        const wrapper = mount(ObjectsGridBodyCell, {
            props: {
                field: { name: "foo" },
                obj: { id: 1 },
                relatedObject: {},
                calculatedObject: {},
                rowIndex: 0,
                columnIndex: 0,
                rowCount: 1,
                columnCount: 1,
                ...props,
            },
            attrs: { class: "outer" },
            slots: {
                value: (slotProps) => {
                    Object.assign(captured, slotProps);
                    return h("span", { "data-qa": "slot" }, slotProps.formatted);
                },
            },
            ...options,
        });
        return { wrapper, captured };
    }

    scopedIt("calls useTheme and passes slot props", () => {
        mockedUseObjectGridCell.mockReturnValue({
            formattedComputed: vue.computed(() => "formatted"),
            valueComputed: vue.computed(() => "value"),
        });
        const { wrapper, captured } = mountComponent();
        expect(mockedUseTheme).toHaveBeenCalledWith("ObjectsGridBodyCell", expect.any(Object), expect.any(Object));
        const div = wrapper.get("div");
        expect(div.classes()).toContain("theme-root");
        expect(div.classes()).toContain("outer");

        expect(captured.formatted).toBe("formatted");
        expect(captured.value).toBe("value");
        expect(captured.obj).toEqual({ id: 1 });
        expect(captured.pk).toBe(1);
        expect(captured.pkKey).toBe("id");
        expect(captured.field).toEqual({ name: "foo" });
        expect(captured.rowIndex).toBe(0);
        expect(captured.columnIndex).toBe(0);
    });

    scopedIt("uses pkKey to provide pk", () => {
        mockedUseObjectGridCell.mockReturnValue({
            formattedComputed: vue.computed(() => "formatted"),
            valueComputed: vue.computed(() => "value"),
        });
        const { captured } = mountComponent({
            pkKey: "uuid",
            obj: { uuid: "u1" },
        });
        expect(captured.pk).toBe("u1");
        expect(captured.pkKey).toBe("uuid");
    });
});
