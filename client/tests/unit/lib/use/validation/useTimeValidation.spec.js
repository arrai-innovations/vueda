import { scopedIt } from "@tests/unit/utils.js";
import { useTimeValidation } from "@vueda/use/validation/useTimeValidation.js";
import { nextTick, reactive } from "vue";

/**
 * @returns {{ state: object, updateError: import("vitest").Mock, deleteError: import("vitest").Mock }}
 */
function makeFieldContext(value = null) {
    return {
        state: reactive({ value }),
        updateError: vi.fn(),
        deleteError: vi.fn(),
    };
}

describe("lib/use/validation/useTimeValidation.js", () => {
    describe("maxValue", () => {
        scopedIt("sets error when time exceeds maxValue", async () => {
            const ctx = makeFieldContext("14:00:00");
            useTimeValidation(ctx, { maxValue: "12:00:00" });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("maxValue", "Must be 12:00:00 or less.");
        });

        scopedIt("clears error when time is within maxValue", async () => {
            const ctx = makeFieldContext("10:00:00");
            useTimeValidation(ctx, { maxValue: "12:00:00" });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("maxValue");
        });
    });

    describe("minValue", () => {
        scopedIt("sets error when time is below minValue", async () => {
            const ctx = makeFieldContext("08:00:00");
            useTimeValidation(ctx, { minValue: "09:00:00" });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("minValue", "Must be 09:00:00 or more.");
        });

        scopedIt("clears error when time meets minValue", async () => {
            const ctx = makeFieldContext("10:00:00");
            useTimeValidation(ctx, { minValue: "09:00:00" });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("minValue");
        });
    });

    describe("step", () => {
        scopedIt("sets error when time is not a multiple of step", async () => {
            // 10:05:00 = 36300 seconds, step 3600 (1 hour) -> 36300 % 3600 = 900 != 0
            const ctx = makeFieldContext("10:05:00");
            useTimeValidation(ctx, { step: 3600 });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("step", "Must be a multiple of 3600.");
        });

        scopedIt("clears error when time is a multiple of step", async () => {
            // 10:00:00 = 36000 seconds, step 3600 -> 36000 % 3600 = 0
            const ctx = makeFieldContext("10:00:00");
            useTimeValidation(ctx, { step: 3600 });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("step");
        });

        scopedIt("handles minute-level steps", async () => {
            // 10:30:00 = 37800 seconds, step 900 (15 min) -> 37800 % 900 = 0
            const ctx = makeFieldContext("10:30:00");
            useTimeValidation(ctx, { step: 900 });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("step");
        });
    });

    describe("null handling", () => {
        scopedIt("clears maxValue error when value is null", async () => {
            const ctx = makeFieldContext(null);
            useTimeValidation(ctx, { maxValue: "12:00:00" });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("maxValue");
        });

        scopedIt("clears minValue error when value is null", async () => {
            const ctx = makeFieldContext(null);
            useTimeValidation(ctx, { minValue: "08:00:00" });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("minValue");
        });
    });

    describe("reactivity", () => {
        scopedIt("reacts to value changes", async () => {
            const ctx = makeFieldContext("10:00:00");
            useTimeValidation(ctx, { maxValue: "12:00:00" });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("maxValue");

            ctx.state.value = "14:00:00";
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("maxValue", "Must be 12:00:00 or less.");
        });
    });

    describe("Date object bounds", () => {
        scopedIt("accepts Date objects as maxValue", async () => {
            // Date with UTC hours 12
            const maxDate = new Date(Date.UTC(2024, 0, 1, 12, 0, 0));
            const ctx = makeFieldContext("14:00:00");
            useTimeValidation(ctx, { maxValue: maxDate });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("maxValue", expect.stringContaining("or less."));
        });
    });
});
