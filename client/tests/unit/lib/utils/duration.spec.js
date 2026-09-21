import { convertDurationToString, normalizeDuration, parseDuration } from "@vueda/utils/duration.js";

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

    describe("normalizeDuration", () => {
        it("normalizes a Django duration string", () => {
            expect(normalizeDuration("3 04:05:06")).toEqual({
                negative: false,
                days: 3,
                hours: 4,
                minutes: 5,
                seconds: 6,
                totalSeconds: 273906,
            });
        });

        it("normalizes a string without days", () => {
            expect(normalizeDuration("07:08:09")).toMatchObject({
                days: 0,
                hours: 7,
                minutes: 8,
                seconds: 9,
            });
        });

        it("normalizes a number of seconds", () => {
            expect(normalizeDuration(5025)).toMatchObject({
                negative: false,
                days: 0,
                hours: 1,
                minutes: 23,
                seconds: 45,
            });
        });

        // A serializer may send a seconds count as a string.
        it("normalizes a numeric string as seconds", () => {
            expect(normalizeDuration("90")).toMatchObject({ minutes: 1, seconds: 30 });
        });

        // Django carries the sign on the day count while the clock part stays positive,
        // so the components have to be recomposed before being split again.
        it("reads a negative duration back as its magnitude plus a sign", () => {
            expect(normalizeDuration("-1 23:00:00")).toMatchObject({
                negative: true,
                days: 0,
                hours: 1,
                minutes: 0,
                seconds: 0,
                totalSeconds: -3600,
            });
        });

        it("drops sub-second precision", () => {
            expect(normalizeDuration("00:00:01.500000")).toMatchObject({ seconds: 1 });
        });

        it("keeps a zero duration, which is a recorded value", () => {
            expect(normalizeDuration("00:00:00")).toMatchObject({ totalSeconds: 0 });
            expect(normalizeDuration(0)).toMatchObject({ totalSeconds: 0 });
        });

        it.each([
            ["null", null],
            ["undefined", undefined],
            ["an empty string", ""],
            ["whitespace", "   "],
            ["unparseable text", "bad"],
            ["an out-of-range clock part", "00:99:00"],
            ["a non-finite number", Number.NaN],
        ])("returns null for %s", (_label, value) => {
            expect(normalizeDuration(value)).toBeNull();
        });
    });
});
