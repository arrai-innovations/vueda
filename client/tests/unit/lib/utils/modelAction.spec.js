import { getModelVerboseName, normalizePks } from "@vueda/utils/modelAction.js";

describe("lib/utils/modelAction.js", () => {
    describe("getModelVerboseName", () => {
        it("uses the names that model info gives", () => {
            const info = { verboseName: "purchase order", verboseNamePlural: "purchase orders" };

            expect(getModelVerboseName(info, "purchaseorder", false)).toBe("purchase order");
            expect(getModelVerboseName(info, "purchaseorder", true)).toBe("purchase orders");
        });

        it("falls back to the model name in lower title case without model info", () => {
            expect(getModelVerboseName(undefined, "invoice", false)).toBe("invoice");
            expect(getModelVerboseName(undefined, "invoice", true)).toBe("invoices");
        });

        it("falls back when model info gives an empty plural name", () => {
            expect(getModelVerboseName({ verboseName: "box", verboseNamePlural: "" }, "box", true)).toBe("boxes");
        });
    });

    describe("normalizePks", () => {
        it("keeps an array's entries in order, without the empty ones", () => {
            expect(normalizePks(["1", undefined, null, "", 2])).toEqual(["1", 2]);
        });

        it("wraps a scalar in an array", () => {
            expect(normalizePks("7")).toEqual(["7"]);
            expect(normalizePks(0)).toEqual([0]);
        });

        it("returns an empty array for an empty value", () => {
            expect(normalizePks(undefined)).toEqual([]);
            expect(normalizePks(null)).toEqual([]);
            expect(normalizePks("")).toEqual([]);
        });
    });
});
