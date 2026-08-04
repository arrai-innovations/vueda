import { scopedIt } from "@tests/unit/utils.js";
import { useFieldValidation } from "@vueda/use/validation/useFieldValidation.js";
import { nextTick, reactive } from "vue";

/**
 * @returns {{ state: object, updateError: import("vitest").Mock, deleteError: import("vitest").Mock }}
 */
function makeFieldContext(value = null) {
    return {
        state: reactive({ value, touched: false }),
        updateError: vi.fn(),
        deleteError: vi.fn(),
    };
}

describe("lib/use/validation/useFieldValidation.js", () => {
    scopedIt("dispatches to text validation", async () => {
        const ctx = makeFieldContext("abcdef");
        useFieldValidation("text", ctx, { maxLength: 3 });
        await nextTick();
        expect(ctx.updateError).toHaveBeenCalledWith("maxLength", "Must be 3 characters or less.");
    });

    scopedIt("dispatches to numeric validation", async () => {
        const ctx = makeFieldContext(10);
        useFieldValidation("numeric", ctx, { maxValue: 5 });
        await nextTick();
        expect(ctx.updateError).toHaveBeenCalledWith("maxValue", "Must be 5 or less.");
    });

    scopedIt("dispatches to decimal validation with coercion", async () => {
        const ctx = makeFieldContext("10");
        useFieldValidation("decimal", ctx, { maxValue: 5 });
        await nextTick();
        expect(ctx.updateError).toHaveBeenCalledWith("maxValue", "Must be 5 or less.");
    });

    scopedIt("dispatches to date validation with dateOnly", async () => {
        const ctx = makeFieldContext("2024-05-11");
        useFieldValidation("date", ctx, { maxValue: "2024-05-10" });
        await nextTick();
        expect(ctx.updateError).toHaveBeenCalledWith("maxValue", "Must be 2024-05-10 or less.");
    });

    scopedIt("dispatches to datetime validation", async () => {
        const ctx = makeFieldContext("2024-05-10T14:00:00");
        useFieldValidation("datetime", ctx, { maxValue: "2024-05-10T12:00:00" });
        await nextTick();
        expect(ctx.updateError).toHaveBeenCalledWith("maxValue", expect.stringContaining("or less."));
    });

    scopedIt("dispatches to time validation", async () => {
        const ctx = makeFieldContext("14:00:00");
        useFieldValidation("time", ctx, { maxValue: "12:00:00" });
        await nextTick();
        expect(ctx.updateError).toHaveBeenCalledWith("maxValue", "Must be 12:00:00 or less.");
    });

    scopedIt("does nothing for undefined type", async () => {
        const ctx = makeFieldContext("test");
        useFieldValidation(undefined, ctx, { maxLength: 3 });
        await nextTick();
        expect(ctx.updateError).not.toHaveBeenCalled();
    });

    scopedIt("does nothing for unrecognized type", async () => {
        const ctx = makeFieldContext("test");
        useFieldValidation("unknown", ctx, { maxLength: 3 });
        await nextTick();
        expect(ctx.updateError).not.toHaveBeenCalled();
    });
});
