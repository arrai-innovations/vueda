import { unifiedGet } from "@vueda/utils/unifiedGet.js";

describe("lib/utils/unifiedGet.js", () => {
    it("returns value from obj when no prefix is used", () => {
        const obj = { foo: { bar: 1 } };
        const related = { foo: { bar: 2 } };
        const calc = { foo: { bar: 3 } };
        expect(unifiedGet(obj, related, calc, "foo.bar")).toBe(1);
    });

    it("uses relatedObj when fieldPath starts with 'related.'", () => {
        const obj = { foo: { bar: 1 } };
        const related = { foo: { bar: 2 } };
        const calc = { foo: { bar: 3 } };
        expect(unifiedGet(obj, related, calc, "related.foo.bar")).toBe(2);
    });

    it("uses calculatedObj when fieldPath starts with 'calculated.'", () => {
        const obj = { foo: { bar: 1 } };
        const related = { foo: { bar: 2 } };
        const calc = { foo: { bar: 3 } };
        expect(unifiedGet(obj, related, calc, "calculated.foo.bar")).toBe(3);
    });

    it("does not treat similar prefixes without dot as special", () => {
        const obj = { relatedValue: 5 };
        const related = { relatedValue: 10 };
        const calc = { relatedValue: 15 };
        expect(unifiedGet(obj, related, calc, "relatedValue")).toBe(5);
    });
});
