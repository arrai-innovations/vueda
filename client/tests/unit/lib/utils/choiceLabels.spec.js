import { choiceDisplay, choiceLabel, choiceValuesMatch, fieldChoiceOptions } from "@vueda/utils/choiceLabels.js";

const choices = [
    { label: "Office", value: "office" },
    { label: "Field", value: "field" },
];

describe("lib/utils/choiceLabels.js", () => {
    describe("fieldChoiceOptions", () => {
        it("returns displayChoices when the field has them", () => {
            const displayChoices = [{ label: "At the office", value: "office" }];
            expect(fieldChoiceOptions({ choices, displayChoices })).toBe(displayChoices);
        });

        it("returns choices when they are an array", () => {
            expect(fieldChoiceOptions({ choices })).toBe(choices);
        });

        it("returns an empty array for choices from the choices endpoint", () => {
            expect(fieldChoiceOptions({ choices: true })).toEqual([]);
        });

        it("returns an empty array for a field without choices", () => {
            expect(fieldChoiceOptions({ choices: false })).toEqual([]);
        });

        it("returns an empty array for a missing field", () => {
            expect(fieldChoiceOptions(undefined)).toEqual([]);
        });
    });

    describe("choiceValuesMatch", () => {
        it("matches equal values", () => {
            expect(choiceValuesMatch("office", "office")).toBe(true);
        });

        it("matches a stored number to its string option value", () => {
            expect(choiceValuesMatch("1", 1)).toBe(true);
        });

        it("matches a stored boolean to its string option value in any letter case", () => {
            expect(choiceValuesMatch("True", true)).toBe(true);
            expect(choiceValuesMatch("false", false)).toBe(true);
        });

        it("does not match null to the string null", () => {
            expect(choiceValuesMatch("null", null)).toBe(false);
        });

        it("does not match different values", () => {
            expect(choiceValuesMatch("office", "field")).toBe(false);
        });
    });

    describe("choiceLabel", () => {
        it("returns the label of the matching option", () => {
            expect(choiceLabel("office", choices)).toBe("Office");
        });

        it("returns the stored value when no option matches", () => {
            expect(choiceLabel("remote", choices)).toBe("remote");
        });

        it("returns the stored value when the matching option has no label", () => {
            expect(choiceLabel("office", [{ value: "office" }])).toBe("office");
        });

        it("reads the label and value from the given option keys", () => {
            const options = [{ name: "Office", id: "office" }];
            expect(choiceLabel("office", options, { optionLabel: "name", optionValue: "id" })).toBe("Office");
        });
    });

    describe("choiceDisplay", () => {
        it("shows a single value as its label", () => {
            expect(choiceDisplay("field", choices)).toBe("Field");
        });

        it("shows an array value as its labels joined with a comma", () => {
            expect(choiceDisplay(["office", "field"], choices)).toBe("Office, Field");
        });

        it("shows each unmatched item of an array value as stored", () => {
            expect(choiceDisplay(["office", "remote"], choices)).toBe("Office, remote");
        });
    });
});
