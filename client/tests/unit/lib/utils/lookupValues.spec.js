import { scopedIt } from "@tests/unit/utils.js";
import {
    comparableLookupValue,
    hasCustomLookupField,
    lookupFieldOf,
    lookupValueOf,
    lookupValuesListParams,
    relatedLookupValueOf,
} from "@vueda/utils/lookupValues.js";

const PK_INFO = { pk: "code", lookupField: null };
const CUSTOM_INFO = { pk: "id", lookupField: "sage_id" };

describe("lib/utils/lookupValues.js", () => {
    describe("lookupFieldOf", () => {
        scopedIt("names the custom lookup field that model info reports", () => {
            expect(lookupFieldOf(CUSTOM_INFO)).toBe("sage_id");
        });

        scopedIt("names the primary key field when model info reports no lookup field", () => {
            expect(lookupFieldOf(PK_INFO)).toBe("code");
        });

        scopedIt("names id before model info loads", () => {
            expect(lookupFieldOf(undefined)).toBe("id");
        });
    });

    describe("hasCustomLookupField", () => {
        scopedIt("is true only when model info reports a lookup field", () => {
            expect(hasCustomLookupField(CUSTOM_INFO)).toBe(true);
            expect(hasCustomLookupField(PK_INFO)).toBe(false);
            expect(hasCustomLookupField(undefined)).toBe(false);
        });
    });

    describe("lookupValuesListParams", () => {
        scopedIt("loads the rows of a custom lookup field through the lookup filter", () => {
            expect(lookupValuesListParams(CUSTOM_INFO, ["SAGE-1", "SAGE-2"])).toEqual({ lookup: ["SAGE-1", "SAGE-2"] });
        });

        scopedIt("loads the rows of a primary key lookup through the id filter", () => {
            expect(lookupValuesListParams(PK_INFO, ["4", "7"])).toEqual({ id: ["4", "7"] });
        });
    });

    describe("lookupValueOf", () => {
        scopedIt("reads the row's value under the lookup field", () => {
            expect(lookupValueOf(CUSTOM_INFO, { id: 5, sage_id: "SAGE-1" })).toBe("SAGE-1");
            expect(lookupValueOf(PK_INFO, { code: "A1" })).toBe("A1");
        });

        scopedIt("is undefined for a row that does not carry the field, or no row", () => {
            expect(lookupValueOf(CUSTOM_INFO, { id: 5 })).toBeUndefined();
            expect(lookupValueOf(CUSTOM_INFO, null)).toBeUndefined();
        });
    });

    describe("relatedLookupValueOf", () => {
        scopedIt("reads an expanded object's lookup value", () => {
            expect(relatedLookupValueOf(CUSTOM_INFO, { id: 5, sage_id: "SAGE-1" })).toBe("SAGE-1");
        });

        scopedIt("uses a scalar primary key when the lookup field is the primary key", () => {
            expect(relatedLookupValueOf(PK_INFO, "A1")).toBe("A1");
        });

        scopedIt("gives no value for a scalar primary key of a model with a custom lookup field", () => {
            expect(relatedLookupValueOf(CUSTOM_INFO, 5)).toBeUndefined();
        });
    });

    describe("comparableLookupValue", () => {
        scopedIt("gives two spellings of one composite key the same form", () => {
            expect(comparableLookupValue("[1, 42]")).toBe('["1","42"]');
            expect(comparableLookupValue('["1", "42"]')).toBe('["1","42"]');
            expect(comparableLookupValue([1, 42])).toBe('["1","42"]');
        });

        scopedIt("keeps a number and its string equal", () => {
            expect(comparableLookupValue(42)).toBe(comparableLookupValue("42"));
        });

        scopedIt("keeps two different strings of a text field apart", () => {
            expect(comparableLookupValue("007")).not.toBe(comparableLookupValue("7"));
        });

        scopedIt("keeps text that starts with a bracket but is not a JSON array as it is", () => {
            expect(comparableLookupValue("[draft")).toBe("[draft");
            expect(comparableLookupValue('["a"')).toBe('["a"');
        });
    });
});
