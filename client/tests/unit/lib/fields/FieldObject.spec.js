import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { h, nextTick, reactive } from "vue";

const fieldState = reactive({ value: undefined });
const mockedUseField = vi.fn(() => ({ state: fieldState }));

vi.mock("@vueda/use/useField.js", async () => {
    const actual = await vi.importActual("@vueda/use/useField.js");
    return {
        __esModule: true,
        ...actual,
        useField: mockedUseField,
    };
});

const warn = vi.fn();
const mockedUseDevLogger = vi.fn(() => ({ warn }));
vi.mock("@vueda/use/useDevLogger.js", () => ({ useDevLogger: mockedUseDevLogger }));

describe("lib/fields/FieldObject.vue", () => {
    let FieldObject;
    beforeEach(async () => {
        vi.clearAllMocks();
        fieldState.value = undefined;
        FieldObject = (await import("@vueda/fields/FieldObject.vue")).default;
    });

    scopedIt("warns when value is not a plain object", async () => {
        fieldState.value = "x";
        mount(FieldObject, { props: { name: "foo" } });
        await nextTick();
        expect(warn).toHaveBeenCalledWith("Expected value to be a plain object, got:", "x");

        warn.mockClear();
        fieldState.value = [1];
        await nextTick();
        expect(warn).toHaveBeenCalledWith("Expected value to be a plain object, got:", [1]);
    });

    scopedIt("does not warn for valid or null values", async () => {
        fieldState.value = { a: 1 };
        mount(FieldObject, { props: { name: "bar" } });
        await nextTick();
        expect(warn).not.toHaveBeenCalled();

        fieldState.value = null;
        await nextTick();
        expect(warn).not.toHaveBeenCalled();
    });

    scopedIt("passes attrs and props through slot", async () => {
        fieldState.value = {};
        const slotData = {};
        const wrapper = mount(FieldObject, {
            props: { name: "my" },
            attrs: { class: "cls", id: "el", title: "t" },
            slots: {
                default: (slotProps) => {
                    Object.assign(slotData, slotProps);
                    return h("div", { "data-qa": "slot" });
                },
            },
        });
        await nextTick();
        expect(wrapper.classes()).toContain("cls");
        expect(slotData.fieldAttrs).toEqual({ id: "el", title: "t" });
        expect(slotData.fieldProps.name).toBe("my");
    });
});
