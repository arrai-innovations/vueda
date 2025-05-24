import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

let FieldDate, useField, useDevLogger, vue;

const setup = async (envDev) => {
    const originalDev = import.meta.env.DEV;
    const originalProd = import.meta.env.PROD;
    import.meta.env.DEV = envDev;
    import.meta.env.PROD = !envDev;

    const updateError = vi.fn();
    const deleteError = vi.fn();
    const state = vue.reactive({ value: "2024-05-05" });
    useField.mockReturnValue({ state, updateError, deleteError });
    const logger = { warn: vi.fn() };
    useDevLogger.mockReturnValue(logger);

    const wrapper = mount(FieldDate, {
        props: { name: "date", minValue: "2024-05-01", maxValue: "2024-05-10" },
    });
    return {
        wrapper,
        state,
        updateError,
        deleteError,
        logger,
        restore() {
            import.meta.env.DEV = originalDev;
            import.meta.env.PROD = originalProd;
        },
    };
};

beforeEach(async () => {
    vi.doMock("@vueda/use/useField.js", () => ({ FIELD_PROPS: {}, FIELD_EMITS: [], useField: vi.fn() }));
    vi.doMock("@vueda/use/useDevLogger.js", () => ({ useDevLogger: vi.fn() }));
    vue = await import("vue");
    useField = (await import("@vueda/use/useField.js")).useField;
    useDevLogger = (await import("@vueda/use/useDevLogger.js")).useDevLogger;
    FieldDate = (await import("@vueda/fields/FieldDate.vue")).default;
});

afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
});

describe("lib/fields/FieldDate.vue", () => {
    scopedIt("validates min and max dates", async () => {
        const { state, updateError, deleteError, restore } = await setup(false);

        state.value = "2024-05-11";
        await vue.nextTick();
        expect(updateError).toHaveBeenCalledWith("maxValue", "Must be 2024-05-10 or less.");

        state.value = "2024-05-05";
        await vue.nextTick();
        expect(deleteError).toHaveBeenCalledWith("maxValue");

        state.value = "2024-04-30";
        await vue.nextTick();
        expect(updateError).toHaveBeenCalledWith("minValue", "Must be 2024-05-01 or more.");

        restore();
    });

    scopedIt("warns for invalid values in DEV", async () => {
        const { state, logger, restore } = await setup(true);

        expect(logger.warn).not.toHaveBeenCalled();
        state.value = new Date();
        await vue.nextTick();
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("Expected value"), state.value);

        logger.warn.mockClear();
        state.value = "2024-13-01";
        await vue.nextTick();
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("not a valid ISO date"), "2024-13-01");

        restore();
    });
});
