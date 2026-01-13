import { convertDurationToString, parseDuration } from "@vueda/utils/duration.js";

describe("lib/utils/duration.js", () => {
    it("parses a full duration with days", () => {
        expect(parseDuration("3 04:05:06")).toEqual({
            days: 3,
            hours: 4,
            minutes: 5,
            seconds: 6,
        });
    });

    it("parses a duration without days", () => {
        expect(parseDuration("07:08:09")).toEqual({
            days: 0,
            hours: 7,
            minutes: 8,
            seconds: 9,
        });
    });

    it("returns null for invalid input", () => {
        expect(parseDuration("bad")).toBeNull();
    });

    it("converts a duration object to a padded string", () => {
        const str = convertDurationToString({ days: 1, hours: 2, minutes: 3, seconds: 4 });
        expect(str).toBe("01 02:03:04");
    });

    it("defaults missing properties to zero", () => {
        const str = convertDurationToString({ hours: 5 });
        expect(str).toBe("00 05:00:00");
    });

    it("round trips through parseDuration", () => {
        const obj = { days: 10, hours: 9, minutes: 8, seconds: 7 };
        const str = convertDurationToString(obj);
        expect(parseDuration(str)).toEqual(obj);
    });
});
