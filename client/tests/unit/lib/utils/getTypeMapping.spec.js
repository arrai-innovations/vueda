import { getSerializerTypes, getTypeMapping, isSerializerType } from "@vueda/utils/getTypeMapping.js";

describe("lib/utils/getTypeMapping.js", () => {
    const mapping = {
        ManyRelatedField: {
            ManyToManyField: { widget: "stock-many-to-many" },
            ForeignKey: { widget: "stock-reverse-foreign-key" },
        },
        RelatedField: {
            ForeignKey: { widget: "related-foreign-key", default: true },
        },
        RolesField: {
            ManyToManyField: { widget: "project-roles" },
        },
    };

    describe("getTypeMapping", () => {
        it("uses the field's own serializer type", () => {
            const field = { typeSerializer: "ManyRelatedField", typeModel: "ManyToManyField" };
            expect(getTypeMapping(mapping, field)).toEqual({ widget: "stock-many-to-many" });
        });

        it("falls back to the nearest ancestor with an entry", () => {
            const field = {
                typeSerializer: "PickDistributorField",
                typeSerializerAncestors: ["PrimaryKeyRelatedField", "RelatedField"],
                typeModel: "ForeignKey",
            };
            expect(getTypeMapping(mapping, field)).toBe(mapping.RelatedField.ForeignKey);
        });

        it("prefers an entry for the subclass's own name over its ancestor's", () => {
            const field = {
                typeSerializer: "RolesField",
                typeSerializerAncestors: ["ManyRelatedField"],
                typeModel: "ManyToManyField",
            };
            expect(getTypeMapping(mapping, field)).toEqual({ widget: "project-roles" });
        });

        it("tries the next ancestor when the subclass's entries do not cover its typeModel", () => {
            const field = {
                typeSerializer: "RolesField",
                typeSerializerAncestors: ["ManyRelatedField"],
                typeModel: "ForeignKey",
            };
            expect(getTypeMapping(mapping, field)).toEqual({ widget: "stock-reverse-foreign-key" });
        });

        it("uses an ancestor's default entry when the field has no typeModel", () => {
            const field = { typeSerializer: "PickDistributorField", typeSerializerAncestors: ["RelatedField"] };
            expect(getTypeMapping(mapping, field)).toEqual({ widget: "related-foreign-key", default: true });
        });

        it("returns undefined when neither the type nor an ancestor has an entry", () => {
            const field = {
                typeSerializer: "ShoutField",
                typeSerializerAncestors: ["CharField"],
                typeModel: "TextField",
            };
            expect(getTypeMapping(mapping, field)).toBeUndefined();
        });

        it("returns undefined for an unmapped type without ancestry", () => {
            expect(getTypeMapping(mapping, { typeSerializer: "RolesField", typeModel: "ForeignKey" })).toBeUndefined();
        });
    });

    describe("getSerializerTypes", () => {
        it("lists the own type, then each ancestor nearest first", () => {
            const field = { typeSerializer: "A", typeSerializerAncestors: ["B", "C"] };
            expect(getSerializerTypes(field)).toEqual(["A", "B", "C"]);
        });

        it("lists only the own type when model info sends no ancestry", () => {
            expect(getSerializerTypes({ typeSerializer: "A" })).toEqual(["A"]);
        });
    });

    describe("isSerializerType", () => {
        it("matches the field's own type and each ancestor", () => {
            const field = { typeSerializer: "RolesField", typeSerializerAncestors: ["ManyRelatedField"] };
            expect(isSerializerType(field, "RolesField")).toBe(true);
            expect(isSerializerType(field, "ManyRelatedField")).toBe(true);
            expect(isSerializerType(field, "CharField")).toBe(false);
        });

        it("is false for an undefined field", () => {
            expect(isSerializerType(undefined, "CharField")).toBe(false);
        });
    });
});
