import {
    getSerializerTypes,
    getTypeMapping,
    isSerializerType,
    resolveSerializerType,
} from "@vueda/utils/getTypeMapping.js";

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

    describe("resolveSerializerType", () => {
        const base = { RolesField: { ManyToManyField: { widget: "project-roles" } } };
        const choice = { ManyRelatedField: { ManyToManyField: { manyWidget: "stock-combobox" } } };
        const roles = {
            typeSerializer: "RolesField",
            typeSerializerAncestors: ["ManyRelatedField"],
            typeModel: "ManyToManyField",
        };

        it("keeps a subclass mapped in any table, even when another table maps only the ancestor", () => {
            const resolved = resolveSerializerType(roles, [base, choice]);
            expect(resolved.typeSerializer).toBe("RolesField");
            expect(resolved.typeSerializerAncestors).toEqual([]);
            expect(getTypeMapping(choice, resolved)).toBeUndefined();
        });

        it("moves to the ancestor when no table maps the subclass for its typeModel", () => {
            const otherTypeModel = { RolesField: { ForeignKey: { widget: "project-roles" } } };
            expect(resolveSerializerType(roles, [otherTypeModel, choice]).typeSerializer).toBe("ManyRelatedField");
            expect(resolveSerializerType(roles, [choice]).typeSerializer).toBe("ManyRelatedField");
        });

        it("returns the field unchanged when no name has an entry", () => {
            const field = {
                typeSerializer: "ShoutField",
                typeSerializerAncestors: ["CharField"],
                typeModel: "TextField",
            };
            expect(resolveSerializerType(field, [base, choice])).toBe(field);
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
