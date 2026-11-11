import { isReverseForeignKey } from "@vueda/utils/reverseForeignKey.js";

describe("lib/utils/reverseForeignKey.js", () => {
    describe("isReverseForeignKey", () => {
        it("matches a ManyRelatedField over a foreign key", () => {
            expect(isReverseForeignKey({ typeSerializer: "ManyRelatedField", typeModel: "ForeignKey" })).toBe(true);
        });

        it("matches a ManyRelatedField subclass over a foreign key", () => {
            const field = {
                typeSerializer: "OwnItemsField",
                typeSerializerAncestors: ["ManyRelatedField"],
                typeModel: "ForeignKey",
            };
            expect(isReverseForeignKey(field)).toBe(true);
        });

        it("does not match a many-to-many relation", () => {
            expect(isReverseForeignKey({ typeSerializer: "ManyRelatedField", typeModel: "ManyToManyField" })).toBe(
                false,
            );
        });

        it("does not match an undefined field", () => {
            expect(isReverseForeignKey(undefined)).toBe(false);
        });
    });
});
