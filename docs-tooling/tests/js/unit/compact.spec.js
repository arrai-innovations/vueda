import { compact } from "../../../js/utils/compact.js";
import { describe, expect, it } from "vitest";

describe("compact", () => {
    it("returns undefined unchanged", () => {
        expect(compact(undefined)).toBeUndefined();
    });

    it("removes undefined values from objects but preserves null", () => {
        const result = compact({ a: 1, b: undefined, c: null });
        expect(result).toEqual({ a: 1, c: null });
        expect("b" in result).toBe(false);
    });

    it("filters undefined items from arrays", () => {
        expect(compact([1, undefined, 2])).toEqual([1, 2]);
    });

    it("recursively removes undefined from nested objects", () => {
        expect(compact({ a: { b: undefined } })).toEqual({ a: {} });
    });

    it("returns numbers, strings, and null unchanged", () => {
        expect(compact(42)).toBe(42);
        expect(compact("hello")).toBe("hello");
        expect(compact(null)).toBe(null);
    });

    it("handles empty objects and arrays", () => {
        expect(compact({})).toEqual({});
        expect(compact([])).toEqual([]);
    });

    it("recursively compacts nested arrays", () => {
        expect(compact([{ a: undefined }, { b: 1 }])).toEqual([{}, { b: 1 }]);
    });
});
