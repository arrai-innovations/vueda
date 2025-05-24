import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

const updateError = vi.fn();
const deleteError = vi.fn();
const warnSpy = vi.fn();
let state;
let vue;
let initialValue = null;

vi.mock("@vueda/use/useField.js", async () => {
    const actualVue = await vi.importActual("vue");
    return {
        FIELD_PROPS: {},
        FIELD_EMITS: [],
        useField: vi.fn(() => {
            state = actualVue.reactive({ value: initialValue });
            return { state, updateError, deleteError };
        }),
    };
});

vi.mock("@vueda/use/useDevLogger.js", () => ({
    useDevLogger: () => ({ warn: warnSpy }),
}));

describe("lib/fields/FieldDecimal.vue", () => {
    let FieldDecimal;
    beforeEach(async () => {
        vue = await vi.importActual("vue");
        FieldDecimal = (await import("@vueda/fields/FieldDecimal.vue")).default;
        updateError.mockClear();
        deleteError.mockClear();
        warnSpy.mockClear();
        initialValue = null;
    });

    scopedIt("validates maxValue with numeric strings", async () => {
        initialValue = "12";
        mount(FieldDecimal, { props: { maxValue: 10 } });
        expect(updateError).toHaveBeenCalledWith("maxValue", "Must be 10 or less.");

        updateError.mockClear();
        deleteError.mockClear();
        state.value = "8";
        await vue.nextTick();
        expect(deleteError).toHaveBeenCalledWith("maxValue");
    });

    scopedIt("validates minValue", async () => {
        initialValue = 1;
        mount(FieldDecimal, { props: { minValue: 2 } });
        expect(updateError).toHaveBeenCalledWith("minValue", "Must be 2 or more.");

        updateError.mockClear();
        deleteError.mockClear();
        state.value = "3";
        await vue.nextTick();
        expect(deleteError).toHaveBeenCalledWith("minValue");
    });

    scopedIt("validates step multiplicity", async () => {
        initialValue = 0.25;
        mount(FieldDecimal, { props: { step: 0.1 } });
        expect(updateError).toHaveBeenCalledWith("step", "Must be a multiple of 0.1.");

        updateError.mockClear();
        deleteError.mockClear();
        state.value = 0.3;
        await vue.nextTick();
        expect(deleteError).toHaveBeenCalledWith("step");
    });

    scopedIt("warns when value is not numeric", () => {
        initialValue = "foo";
        mount(FieldDecimal);
        expect(warnSpy).toHaveBeenCalled();
    });
});
