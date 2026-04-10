import { scopedIt } from "@tests/unit/utils.js";
import { nextTick, reactive } from "vue";

let useDevTypeGuard, warnSpy;

vi.mock("@vueda/use/useDevLogger.js", () => ({
    useDevLogger: () => ({ warn: warnSpy }),
}));

beforeEach(async () => {
    warnSpy = vi.fn();
    useDevTypeGuard = (await import("@vueda/use/validation/useDevTypeGuard.js")).useDevTypeGuard;
});

afterEach(() => {
    vi.clearAllMocks();
});

/**
 * @param {*} value
 * @returns {{ state: object, updateError: import("vitest").Mock, deleteError: import("vitest").Mock }}
 */
function makeFieldContext(value) {
    return {
        state: reactive({ value }),
        updateError: vi.fn(),
        deleteError: vi.fn(),
    };
}

describe("lib/use/validation/useDevTypeGuard.js", () => {
    scopedIt("warns when check returns a message", async () => {
        const ctx = makeFieldContext(42);
        useDevTypeGuard(ctx, (value) => (typeof value !== "string" ? "Expected a string, got:" : null));
        await nextTick();
        expect(warnSpy).toHaveBeenCalledWith("Expected a string, got:", 42);
    });

    scopedIt("does not warn when check returns null", async () => {
        const ctx = makeFieldContext("hello");
        useDevTypeGuard(ctx, (value) => (typeof value !== "string" ? "Expected a string, got:" : null));
        await nextTick();
        expect(warnSpy).not.toHaveBeenCalled();
    });

    scopedIt("skips null values by default", async () => {
        const ctx = makeFieldContext(null);
        useDevTypeGuard(ctx, () => "should not fire");
        await nextTick();
        expect(warnSpy).not.toHaveBeenCalled();
    });

    scopedIt("checks null values when includeNull is true", async () => {
        const ctx = makeFieldContext(null);
        useDevTypeGuard(ctx, () => "null should still be checked", { includeNull: true });
        await nextTick();
        expect(warnSpy).toHaveBeenCalledWith("null should still be checked", null);
    });

    scopedIt("ignores undefined values", async () => {
        warnSpy.mockClear();
        const ctx = makeFieldContext(undefined);
        useDevTypeGuard(ctx, () => "should not fire");
        await nextTick();
        expect(warnSpy).not.toHaveBeenCalled();
    });

    scopedIt("reacts to value changes", async () => {
        const ctx = makeFieldContext("hello");
        useDevTypeGuard(ctx, (value) => (typeof value !== "string" ? "Expected a string, got:" : null));
        await nextTick();
        expect(warnSpy).not.toHaveBeenCalled();

        ctx.state.value = 42;
        await nextTick();
        expect(warnSpy).toHaveBeenCalledWith("Expected a string, got:", 42);
    });
});
