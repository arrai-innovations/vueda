import {
    addSortField,
    formatSortField,
    formatSortQuery,
    indexOfSortField,
    parseSortField,
    parseSortQuery,
    removeSortField,
    sanitizeSortFields,
    sortFieldBases,
    toggleSortField,
} from "@vueda/utils/sortedFields.js";

describe("lib/utils/sortedFields.js", () => {
    describe("parseSortField", () => {
        it("reads an ascending entry", () => {
            expect(parseSortField("name")).toEqual({ base: "name", descending: false });
        });

        it("reads a descending entry", () => {
            expect(parseSortField("-name")).toEqual({ base: "name", descending: true });
        });

        it("treats a nullish entry as an empty ascending base", () => {
            expect(parseSortField(undefined)).toEqual({ base: "", descending: false });
        });
    });

    describe("formatSortField", () => {
        it("formats ascending without a prefix", () => {
            expect(formatSortField("name")).toBe("name");
            expect(formatSortField("name", false)).toBe("name");
        });

        it("formats descending with a leading dash", () => {
            expect(formatSortField("name", true)).toBe("-name");
        });
    });

    describe("sortFieldBases", () => {
        it("strips direction from every entry", () => {
            expect(sortFieldBases(["-updated", "mrr"])).toEqual(["updated", "mrr"]);
        });
    });

    describe("sort query helpers", () => {
        it("parses comma-separated and repeated query values", () => {
            expect(parseSortQuery("-updated,mrr")).toEqual(["-updated", "mrr"]);
            expect(parseSortQuery(["-updated", "mrr,status"])).toEqual(["-updated", "mrr", "status"]);
            expect(parseSortQuery(null)).toEqual([]);
        });

        it("formats an active query and omits an empty query", () => {
            expect(formatSortQuery(["-updated", "mrr"])).toBe("-updated,mrr");
            expect(formatSortQuery([])).toBeUndefined();
        });

        it("drops unknown and duplicate sort fields", () => {
            expect(sanitizeSortFields(["-updated", "bogus", "updated", "mrr"], ["updated", "mrr"])).toEqual([
                "-updated",
                "mrr",
            ]);
        });
    });

    describe("indexOfSortField", () => {
        it("finds a field regardless of direction", () => {
            expect(indexOfSortField(["-updated", "mrr"], "updated")).toBe(0);
            expect(indexOfSortField(["-updated", "mrr"], "mrr")).toBe(1);
        });

        it("returns -1 when absent", () => {
            expect(indexOfSortField(["-updated"], "mrr")).toBe(-1);
        });
    });

    describe("addSortField", () => {
        it("appends a new field ascending", () => {
            expect(addSortField(["-updated"], "mrr")).toEqual(["-updated", "mrr"]);
        });

        it("appends descending when requested", () => {
            expect(addSortField(["mrr"], "updated", { descending: true })).toEqual(["mrr", "-updated"]);
        });

        it("is a no-op copy when the field is already present in either direction", () => {
            const sorted = ["-updated", "mrr"];
            expect(addSortField(sorted, "updated")).toEqual(["-updated", "mrr"]);
            expect(addSortField(sorted, "mrr")).not.toBe(sorted);
        });
    });

    describe("removeSortField", () => {
        it("removes a field matched by base, ignoring direction", () => {
            expect(removeSortField(["-updated", "mrr"], "updated")).toEqual(["mrr"]);
            expect(removeSortField(["updated", "mrr"], "mrr")).toEqual(["updated"]);
        });

        it("leaves the order unchanged when the field is absent", () => {
            expect(removeSortField(["-updated"], "mrr")).toEqual(["-updated"]);
        });
    });

    describe("toggleSortField", () => {
        it("flips ascending to descending in place, keeping other fields", () => {
            expect(toggleSortField(["updated", "mrr"], "updated")).toEqual(["-updated", "mrr"]);
        });

        it("flips descending to ascending", () => {
            expect(toggleSortField(["-updated", "mrr"], "updated")).toEqual(["updated", "mrr"]);
        });

        it("is a no-op copy when the field is absent", () => {
            const sorted = ["-updated"];
            expect(toggleSortField(sorted, "mrr")).toEqual(["-updated"]);
            expect(toggleSortField(sorted, "mrr")).not.toBe(sorted);
        });
    });
});
