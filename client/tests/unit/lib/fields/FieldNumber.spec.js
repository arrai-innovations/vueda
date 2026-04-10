import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";

const mockedUseField = vi.fn();
let warnSpy;

vi.mock("@vueda/use/useField.js", async () => {
    const actual = await vi.importActual("@vueda/use/useField.js");
    return { ...actual, useField: mockedUseField };
});

vi.mock("@vueda/use/useDevLogger.js", () => ({
    useDevLogger: () => ({ warn: warnSpy }),
}));

let vue, FieldNumber, fieldContext;

beforeEach(async () => {
    warnSpy = vi.fn();
    vue = await vi.importActual("vue");
    FieldNumber = (await import("@vueda/fields/FieldNumber.vue")).default;
    fieldContext = {
        state: vue.reactive({ value: null }),
        updateError: vi.fn(),
        deleteError: vi.fn(),
    };
    mockedUseField.mockReturnValue(fieldContext);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/fields/FieldNumber.vue", () => {
    scopedIt("validates max and min values", async () => {
        fieldContext.state.value = 5;
        const wrapper = mount(FieldNumber, {
            props: { name: "n", maxValue: 3, minValue: 2 },
        });
        await flushPromises();
        expect(fieldContext.updateError).toHaveBeenCalledWith("maxValue", "Must be 3 or less.");
        expect(fieldContext.deleteError).toHaveBeenCalledWith("minValue");

        fieldContext.updateError.mockClear();
        fieldContext.deleteError.mockClear();

        await wrapper.setProps({ maxValue: 6, minValue: 6 });
        await flushPromises();
        expect(fieldContext.deleteError).toHaveBeenCalledWith("maxValue");
        expect(fieldContext.updateError).toHaveBeenCalledWith("minValue", "Must be 6 or more.");
    });

    scopedIt("validates step multiples", async () => {
        fieldContext.state.value = 3;
        const wrapper = mount(FieldNumber, {
            props: { name: "n", step: 2 },
        });
        await flushPromises();
        expect(fieldContext.updateError).toHaveBeenCalledWith("step", "Must be a multiple of 2.");

        fieldContext.updateError.mockClear();
        fieldContext.deleteError.mockClear();
        fieldContext.state.value = 4;
        await flushPromises();
        expect(fieldContext.deleteError).toHaveBeenCalledWith("step");

        await wrapper.unmount();
    });

    scopedIt("warns when value is not a number", async () => {
        fieldContext.state.value = "abc";
        mount(FieldNumber, { props: { name: "n" } });
        await flushPromises();
        expect(warnSpy).toHaveBeenCalledWith("Expected value to be a number, got:", "abc");
    });
    scopedIt("clears step error when step prop is missing", async () => {
        mount(FieldNumber, { props: { name: "n" } });
        await flushPromises();
        expect(fieldContext.deleteError).toHaveBeenCalledWith("step");
    });

    scopedIt("handles decimal step scale factor correctly", async () => {
        fieldContext.state.value = 0.25;
        mount(FieldNumber, { props: { name: "n", step: 0.1 } });
        await flushPromises();
        expect(fieldContext.updateError).toHaveBeenCalledWith("step", "Must be a multiple of 0.1.");

        fieldContext.updateError.mockClear();
        fieldContext.deleteError.mockClear();
        fieldContext.state.value = 0.3;
        await flushPromises();
        expect(fieldContext.deleteError).toHaveBeenCalledWith("step");
    });

    scopedIt.each([null, undefined])("does not warn when value is %s", async (val) => {
        fieldContext.state.value = val;
        mount(FieldNumber, { props: { name: "n" } });
        await flushPromises();
        expect(warnSpy).not.toHaveBeenCalled();
    });
});
