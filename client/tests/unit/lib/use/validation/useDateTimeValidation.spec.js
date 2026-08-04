import { scopedIt } from "@tests/unit/utils.js";
import { useDateTimeValidation } from "@vueda/use/validation/useDateTimeValidation.js";
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

describe("lib/use/validation/useDateTimeValidation.js", () => {
    describe("date-only mode", () => {
        scopedIt("sets maxValue error for date exceeding max", async () => {
            const ctx = makeFieldContext("2024-05-11");
            useDateTimeValidation(ctx, { maxValue: "2024-05-10" }, { dateOnly: true });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("maxValue", "Must be 2024-05-10 or less.");
        });

        scopedIt("clears maxValue error for date within max", async () => {
            const ctx = makeFieldContext("2024-05-05");
            useDateTimeValidation(ctx, { maxValue: "2024-05-10" }, { dateOnly: true });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("maxValue");
        });

        scopedIt("sets minValue error for date below min", async () => {
            const ctx = makeFieldContext("2024-04-30");
            useDateTimeValidation(ctx, { minValue: "2024-05-01" }, { dateOnly: true });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("minValue", "Must be 2024-05-01 or more.");
        });

        scopedIt("clears minValue error for date meeting min", async () => {
            const ctx = makeFieldContext("2024-05-05");
            useDateTimeValidation(ctx, { minValue: "2024-05-01" }, { dateOnly: true });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("minValue");
        });

        scopedIt("handles null value", async () => {
            const ctx = makeFieldContext(null);
            useDateTimeValidation(ctx, { maxValue: "2024-05-10", minValue: "2024-05-01" }, { dateOnly: true });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("maxValue");
            expect(ctx.deleteError).toHaveBeenCalledWith("minValue");
        });

        scopedIt("reacts to value changes", async () => {
            const ctx = makeFieldContext("2024-05-05");
            useDateTimeValidation(ctx, { maxValue: "2024-05-10" }, { dateOnly: true });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("maxValue");

            ctx.state.value = "2024-05-11";
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("maxValue", "Must be 2024-05-10 or less.");
        });

        scopedIt("accepts Date objects as bounds", async () => {
            const ctx = makeFieldContext("2024-05-11");
            useDateTimeValidation(ctx, { maxValue: new Date(2024, 4, 10) }, { dateOnly: true });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("maxValue", expect.stringContaining("or less."));
        });
    });

    describe("datetime mode", () => {
        scopedIt("sets maxValue error for datetime exceeding max", async () => {
            const ctx = makeFieldContext("2024-05-10T12:00:00");
            useDateTimeValidation(ctx, { maxValue: "2024-05-10T10:00:00" });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("maxValue", expect.stringContaining("or less."));
        });

        scopedIt("clears maxValue error for datetime within max", async () => {
            const ctx = makeFieldContext("2024-05-10T08:00:00");
            useDateTimeValidation(ctx, { maxValue: "2024-05-10T10:00:00" });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("maxValue");
        });
    });
});
