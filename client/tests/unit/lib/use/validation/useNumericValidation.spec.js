import { scopedIt } from "@tests/unit/utils.js";
import { useNumericValidation } from "@vueda/use/validation/useNumericValidation.js";
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

describe("lib/use/validation/useNumericValidation.js", () => {
    describe("maxValue", () => {
        scopedIt("sets error when value exceeds maxValue", async () => {
            const ctx = makeFieldContext(10);
            useNumericValidation(ctx, { maxValue: 5 });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("maxValue", "Must be 5 or less.");
        });

        scopedIt("clears error when value is within maxValue", async () => {
            const ctx = makeFieldContext(3);
            useNumericValidation(ctx, { maxValue: 5 });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("maxValue");
        });

        scopedIt("clears error when value is null", async () => {
            const ctx = makeFieldContext(null);
            useNumericValidation(ctx, { maxValue: 5 });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("maxValue");
        });
    });

    describe("minValue", () => {
        scopedIt("sets error when value is below minValue", async () => {
            const ctx = makeFieldContext(1);
            useNumericValidation(ctx, { minValue: 5 });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("minValue", "Must be 5 or more.");
        });

        scopedIt("clears error when value meets minValue", async () => {
            const ctx = makeFieldContext(5);
            useNumericValidation(ctx, { minValue: 5 });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("minValue");
        });
    });

    describe("step", () => {
        scopedIt("sets error when value is not a multiple of step", async () => {
            const ctx = makeFieldContext(3);
            useNumericValidation(ctx, { step: 2 });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("step", "Must be a multiple of 2.");
        });

        scopedIt("clears error when value is a multiple of step", async () => {
            const ctx = makeFieldContext(4);
            useNumericValidation(ctx, { step: 2 });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("step");
        });

        scopedIt("handles decimal step with scale factor", async () => {
            const ctx = makeFieldContext(0.3);
            useNumericValidation(ctx, { step: 0.1 });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("step");
        });

        scopedIt("detects decimal step violation", async () => {
            const ctx = makeFieldContext(0.25);
            useNumericValidation(ctx, { step: 0.1 });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("step", "Must be a multiple of 0.1.");
        });

        scopedIt("clears error when value is null", async () => {
            const ctx = makeFieldContext(null);
            useNumericValidation(ctx, { step: 2 });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("step");
        });
    });

    describe("coercion", () => {
        scopedIt("coerces numeric strings when coerce config is true", async () => {
            const ctx = makeFieldContext("10");
            useNumericValidation(ctx, { maxValue: 5 }, { coerce: true });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("maxValue", "Must be 5 or less.");
        });

        scopedIt("does not coerce strings when coerce is false", async () => {
            const ctx = makeFieldContext("10");
            useNumericValidation(ctx, { maxValue: 5 });
            await nextTick();
            // "10" > 5 is true in JS string comparison, but the original FieldNumber
            // behavior does not coerce, so this tests the default path
            expect(ctx.updateError).toHaveBeenCalledWith("maxValue", "Must be 5 or less.");
        });

        scopedIt("coerces for step validation", async () => {
            const ctx = makeFieldContext("3");
            useNumericValidation(ctx, { step: 2 }, { coerce: true });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("step", "Must be a multiple of 2.");
        });
    });

    describe("reactivity", () => {
        scopedIt("reacts to value changes", async () => {
            const ctx = makeFieldContext(3);
            useNumericValidation(ctx, { maxValue: 5 });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("maxValue");

            ctx.state.value = 10;
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("maxValue", "Must be 5 or less.");
        });
    });
});
