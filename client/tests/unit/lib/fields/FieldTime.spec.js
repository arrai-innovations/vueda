import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { reactive } from "vue";

let FieldTime;
let useFieldMock;
let warnSpy;
let originalDev;

const createFieldContext = (value) => {
    return {
        state: reactive({ value }),
        updateError: vi.fn(),
        deleteError: vi.fn(),
    };
};

describe("lib/fields/FieldTime.vue", () => {
    beforeEach(async () => {
        originalDev = import.meta.env.DEV;
        import.meta.env.DEV = true;
        warnSpy = vi.fn();
        useFieldMock = vi.fn();
        vi.doMock("@vueda/use/useField.js", () => ({
            FIELD_EMITS: [],
            FIELD_PROPS: { name: { type: String } },
            useField: useFieldMock,
        }));
        vi.doMock("@vueda/use/useDevLogger.js", () => ({
            useDevLogger: () => ({ warn: warnSpy }),
        }));
        vi.resetModules();
        FieldTime = (await import("@vueda/fields/FieldTime.vue")).default;
    });

    afterEach(() => {
        import.meta.env.DEV = originalDev;
        vi.resetModules();
        vi.clearAllMocks();
    });

    const mountField = async (props = {}, value = "12:00:00") => {
        const context = createFieldContext(value);
        useFieldMock.mockReturnValue(context);
        const wrapper = mount(FieldTime, {
            props: { name: "time", ...props },
        });
        await flushPromises();
        return { wrapper, context };
    };

    scopedIt("clears errors when value meets constraints", async () => {
        const { context } = await mountField({ maxValue: "13:00:00", minValue: "11:00:00", step: 60 }, "12:00:00");
        expect(context.updateError).not.toHaveBeenCalled();
        expect(context.deleteError).toHaveBeenCalledWith("maxValue");
        expect(context.deleteError).toHaveBeenCalledWith("minValue");
        expect(context.deleteError).toHaveBeenCalledWith("step");
    });

    scopedIt("adds maxValue error when value is too large", async () => {
        const { context } = await mountField({ maxValue: "12:00:00" }, "12:30:00");
        expect(context.updateError).toHaveBeenCalledWith("maxValue", "Must be 12:00:00 or less.");
    });

    scopedIt("adds minValue error when value is too small", async () => {
        const { context } = await mountField({ minValue: "12:00:00" }, "11:00:00");
        expect(context.updateError).toHaveBeenCalledWith("minValue", "Must be 12:00:00 or more.");
    });

    scopedIt("adds step error when value is not a multiple", async () => {
        const { context } = await mountField({ step: 60 }, "12:00:30");
        expect(context.updateError).toHaveBeenCalledWith("step", "Must be a multiple of 60.");
    });

    scopedIt("warns when value is an invalid string", async () => {
        const { context } = await mountField({}, "bad");
        expect(warnSpy).toHaveBeenCalledWith("Value is a string but not a valid HH:mm:ss time:", "bad");
        // ensure other validators still run
        expect(context.deleteError).toHaveBeenCalledWith("minValue");
    });

    scopedIt("warns when value is a Date object", async () => {
        const value = new Date();
        const { context } = await mountField({}, value);
        expect(warnSpy).toHaveBeenCalledWith("Expected value to be a string (HH:mm:ss), got:", value);
        expect(context.deleteError).toHaveBeenCalledWith("minValue");
    });
});
