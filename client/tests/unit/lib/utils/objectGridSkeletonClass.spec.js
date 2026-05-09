import { getSkeletonClassForField } from "@vueda/utils/objectGridSkeletonClass.js";

describe("lib/utils/objectGridSkeletonClass.js", () => {
    it("returns full-width fallback for undefined field", () => {
        expect(getSkeletonClassForField(undefined)).toBe("h-3 w-full");
    });

    it("returns field.skeletonClass when set", () => {
        expect(getSkeletonClassForField({ skeletonClass: "h-10 w-10" })).toBe("h-10 w-10");
    });

    it("returns control-radius slab for selected_ field", () => {
        expect(getSkeletonClassForField({ name: "selected_" })).toBe("size-4 rounded-vueda-control");
    });

    it("returns pill for BooleanField", () => {
        expect(getSkeletonClassForField({ typeSerializer: "BooleanField" })).toBe("h-3.5 w-12 rounded-full");
    });

    it("returns narrow width for choices", () => {
        expect(getSkeletonClassForField({ choices: ["a", "b"] })).toBe("h-3 w-24");
    });

    it("returns narrow width for CharField", () => {
        expect(getSkeletonClassForField({ typeDb: "CharField" })).toBe("h-3 w-24");
    });

    it("returns date width for DateField", () => {
        expect(getSkeletonClassForField({ typeDb: "DateField" })).toBe("h-3 w-16");
    });

    it("returns date width for DateTimeField", () => {
        expect(getSkeletonClassForField({ typeDb: "DateTimeField" })).toBe("h-3 w-16");
    });

    it("returns wide width for ForeignKey", () => {
        expect(getSkeletonClassForField({ typeDb: "ForeignKey" })).toBe("h-3 w-40");
    });

    it("returns wide width for formatted field", () => {
        expect(getSkeletonClassForField({ formatted: true })).toBe("h-3 w-40");
    });

    it("returns full-width default for unknown field", () => {
        expect(getSkeletonClassForField({ name: "misc" })).toBe("h-3 w-full");
    });
});
