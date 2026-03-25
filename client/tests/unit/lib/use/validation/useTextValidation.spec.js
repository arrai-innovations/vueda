import { scopedIt } from "@tests/unit/utils.js";
import { useTextValidation } from "@vueda/use/validation/useTextValidation.js";
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

describe("lib/use/validation/useTextValidation.js", () => {
    describe("maxLength", () => {
        scopedIt("sets error when value exceeds maxLength", async () => {
            const ctx = makeFieldContext("abcdef");
            useTextValidation(ctx, { maxLength: 5 });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("maxLength", "Must be 5 characters or less.");
        });

        scopedIt("does not set error when value is within maxLength", async () => {
            const ctx = makeFieldContext("abc");
            useTextValidation(ctx, { maxLength: 5 });
            await nextTick();
            expect(ctx.updateError).not.toHaveBeenCalledWith("maxLength", expect.any(String));
        });

        scopedIt("reacts to value changes", async () => {
            const ctx = makeFieldContext("abc");
            useTextValidation(ctx, { maxLength: 5 });
            await nextTick();
            expect(ctx.updateError).not.toHaveBeenCalledWith("maxLength", expect.any(String));

            ctx.state.value = "abcdef";
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("maxLength", "Must be 5 characters or less.");
        });
    });

    describe("minLength", () => {
        scopedIt("sets error when value is below minLength", async () => {
            const ctx = makeFieldContext("ab");
            useTextValidation(ctx, { minLength: 3 });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("minLength", "Must be 3 characters or more.");
        });

        scopedIt("does not set error when value meets minLength", async () => {
            const ctx = makeFieldContext("abc");
            useTextValidation(ctx, { minLength: 3 });
            await nextTick();
            expect(ctx.updateError).not.toHaveBeenCalledWith("minLength", expect.any(String));
        });
    });

    describe("patternRegex", () => {
        scopedIt("sets error when touched and value does not match pattern", async () => {
            const ctx = makeFieldContext("abc");
            ctx.state.touched = true;
            useTextValidation(ctx, { patternRegex: "^\\d+$", patternForMessage: "a number" });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("pattern", 'Must match "a number".');
        });

        scopedIt("clears error when value matches pattern", async () => {
            const ctx = makeFieldContext("123");
            ctx.state.touched = true;
            useTextValidation(ctx, { patternRegex: "^\\d+$" });
            await nextTick();
            expect(ctx.deleteError).toHaveBeenCalledWith("pattern");
        });

        scopedIt("does not validate pattern when not touched", async () => {
            const ctx = makeFieldContext("abc");
            useTextValidation(ctx, { patternRegex: "^\\d+$" });
            await nextTick();
            expect(ctx.updateError).not.toHaveBeenCalledWith("pattern", expect.any(String));
            expect(ctx.deleteError).toHaveBeenCalledWith("pattern");
        });

        scopedIt("reacts to touched state change", async () => {
            const ctx = makeFieldContext("abc");
            useTextValidation(ctx, { patternRegex: "^\\d+$", patternForMessage: "digits" });
            await nextTick();
            expect(ctx.updateError).not.toHaveBeenCalledWith("pattern", expect.any(String));

            ctx.state.touched = true;
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("pattern", 'Must match "digits".');
        });

        scopedIt("uses regex toString when patternForMessage is not provided", async () => {
            const ctx = makeFieldContext("abc");
            ctx.state.touched = true;
            useTextValidation(ctx, { patternRegex: "^\\d+$" });
            await nextTick();
            expect(ctx.updateError).toHaveBeenCalledWith("pattern", expect.stringContaining("^\\d+$"));
        });
    });
});
