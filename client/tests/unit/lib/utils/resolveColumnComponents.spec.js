import toManyPayloads from "../../../../../server/tests/fixtures/to-many-list-payloads.json";
import { scopedIt } from "@tests/unit/utils.js";
import { availableColumns } from "@vueda/utils/columnLookups.js";
import { columnMappings } from "@vueda/utils/columnMappings.js";
import { resolveColumnComponent, resolveColumnProps, resolveColumns } from "@vueda/utils/resolveColumnComponents.js";
import { defineComponent } from "vue";

const CustomColumn = defineComponent({ name: "CustomColumn", setup: () => () => null });
const OtherColumn = defineComponent({ name: "OtherColumn", setup: () => () => null });

describe("lib/utils/resolveColumnComponents.js", () => {
    // columnMappings is mutated by mergeColumnMappings; snapshot and restore so
    // tests that register a type default do not leak into one another.
    let savedMappings;
    beforeEach(() => {
        savedMappings = JSON.parse(JSON.stringify(columnMappings));
    });
    afterEach(() => {
        for (const key of Object.keys(columnMappings)) {
            delete columnMappings[key];
        }
        Object.assign(columnMappings, savedMappings);
    });

    describe("resolveColumnComponent precedence", () => {
        scopedIt("resolves a serializer field subclass through its ancestor's column", () => {
            const stock = { name: "a", typeSerializer: "PrimaryKeyRelatedField", typeModel: "ForeignKey" };
            const subclass = {
                name: "a",
                typeSerializer: "PickDistributorField",
                typeSerializerAncestors: ["PrimaryKeyRelatedField", "RelatedField"],
                typeModel: "ForeignKey",
            };
            expect(resolveColumnComponent(subclass)).toBe(resolveColumnComponent(stock));
            expect(resolveColumnComponent(subclass)).not.toBe(availableColumns.ColumnText);
            expect(resolveColumnProps(subclass)).toEqual(resolveColumnProps(stock));
        });

        scopedIt("falls back to ColumnText when nothing matches", () => {
            const component = resolveColumnComponent({ name: "a", typeSerializer: "CharField" });
            expect(component).toBe(availableColumns.ColumnText);
        });

        scopedIt("uses the type default from columnMappings when present", () => {
            columnMappings.CharField = { CharField: { column: "ColumnText", default: true } };
            const component = resolveColumnComponent({
                name: "a",
                typeSerializer: "CharField",
                typeModel: "CharField",
            });
            expect(component).toBe(availableColumns.ColumnText);
        });

        scopedIt("config override beats the type default", () => {
            columnMappings.CharField = { CharField: { column: "ColumnText", default: true } };
            const component = resolveColumnComponent(
                { name: "a", typeSerializer: "CharField", typeModel: "CharField" },
                undefined,
                { a: CustomColumn },
            );
            expect(component).toBe(CustomColumn);
        });

        scopedIt("prop override beats the config override", () => {
            const component = resolveColumnComponent(
                { name: "a", typeSerializer: "CharField" },
                { a: OtherColumn },
                { a: CustomColumn },
            );
            expect(component).toBe(OtherColumn);
        });

        scopedIt("resolves a string override through availableColumns", () => {
            const component = resolveColumnComponent({ name: "a" }, { a: "ColumnText" });
            expect(component).toBe(availableColumns.ColumnText);
        });

        scopedIt("throws on an unknown string key, naming the key and the column", () => {
            expect(() => resolveColumnComponent({ name: "a" }, { a: "ColumnNope" })).toThrow(
                'No column component named "ColumnNope" for column "a"',
            );
        });

        scopedIt("calls a () => component override for its component, as the form chain does", () => {
            const component = resolveColumnComponent({ name: "a" }, { a: () => CustomColumn });
            expect(component).toBe(CustomColumn);
        });

        scopedIt("throws when a () => component override returns nothing", () => {
            expect(() => resolveColumnComponent({ name: "a" }, { a: () => undefined }, { a: CustomColumn })).toThrow(
                'No column component returned by the function configured for column "a"',
            );
        });

        scopedIt("does not cover an unknown prop string key with the config override", () => {
            expect(() => resolveColumnComponent({ name: "a" }, { a: "ColumnNope" }, { a: CustomColumn })).toThrow(
                'No column component named "ColumnNope" for column "a"',
            );
        });

        scopedIt("throws on a type mapping column that names no component", () => {
            columnMappings.CharField = { CharField: { column: "ColumnNope", default: true } };
            expect(() =>
                resolveColumnComponent({ name: "a", typeSerializer: "CharField", typeModel: "CharField" }),
            ).toThrow('No column component named "ColumnNope" in the type mapping for column "a"');
        });

        scopedIt("an override still wins over a broken type mapping", () => {
            columnMappings.CharField = { CharField: { column: "ColumnNope", default: true } };
            const component = resolveColumnComponent(
                { name: "a", typeSerializer: "CharField", typeModel: "CharField" },
                undefined,
                { a: CustomColumn },
            );
            expect(component).toBe(CustomColumn);
        });

        scopedIt("throws on an unknown config string key", () => {
            expect(() => resolveColumnComponent({ name: "a" }, undefined, { a: "ColumnNope" })).toThrow(
                'No column component named "ColumnNope" for column "a"',
            );
        });
    });

    describe("date/time type defaults", () => {
        scopedIt("DateField resolves to ColumnDateTime with showTime false", () => {
            const field = { name: "d", typeSerializer: "DateField", typeModel: "DateField" };
            expect(resolveColumnComponent(field)).toBe(availableColumns.ColumnDateTime);
            expect(resolveColumnProps(field)).toEqual({ showTime: false });
        });

        scopedIt("DateTimeField resolves to ColumnDateTime with showTime true", () => {
            const field = { name: "dt", typeSerializer: "DateTimeField", typeModel: "DateTimeField" };
            expect(resolveColumnComponent(field)).toBe(availableColumns.ColumnDateTime);
            expect(resolveColumnProps(field)).toEqual({ showTime: true });
        });

        scopedIt("TimeField resolves to ColumnDateTime with time-only formatting", () => {
            const field = { name: "t", typeSerializer: "TimeField", typeModel: "TimeField" };
            expect(resolveColumnComponent(field)).toBe(availableColumns.ColumnDateTime);
            expect(resolveColumnProps(field)).toEqual({ format: "t", showRelative: false, showTooltip: false });
        });

        scopedIt("a columnProps override merges over the date type default", () => {
            const field = { name: "d", typeSerializer: "DateField", typeModel: "DateField" };
            expect(resolveColumnProps(field, { d: { showTime: true, format: "break" } })).toEqual({
                showTime: true,
                format: "break",
            });
        });
    });

    describe("email and URL type defaults", () => {
        scopedIt.each([
            ["EmailField", "EmailField", "ColumnEmail"],
            ["EmailField", "CharField", "ColumnEmail"],
            ["URLField", "URLField", "ColumnUrl"],
            ["URLField", "TextField", "ColumnUrl"],
        ])("a %s over a model %s resolves to %s", (typeSerializer, typeModel, column) => {
            const field = { name: "contact", typeSerializer, typeModel };
            expect(resolveColumnComponent(field)).toBe(availableColumns[column]);
            expect(resolveColumnProps(field)).toEqual({});
        });

        scopedIt.each([["EmailField"], ["URLField"]])(
            "a prop override, then a model config override, replaces the %s default",
            (type) => {
                const field = { name: "contact", typeSerializer: type, typeModel: type };
                expect(resolveColumnComponent(field, undefined, { contact: CustomColumn })).toBe(CustomColumn);
                expect(resolveColumnComponent(field, { contact: OtherColumn }, { contact: CustomColumn })).toBe(
                    OtherColumn,
                );
                expect(resolveColumnComponent(field, { contact: "ColumnText" })).toBe(availableColumns.ColumnText);
            },
        );
    });

    describe("foreign-key type defaults", () => {
        scopedIt("ForeignKey resolves to ColumnModelLink with view read", () => {
            const field = { name: "category", typeSerializer: "PrimaryKeyRelatedField", typeModel: "ForeignKey" };
            expect(resolveColumnComponent(field)).toBe(availableColumns.ColumnModelLink);
            expect(resolveColumnProps(field)).toEqual({ view: "read" });
        });

        scopedIt("OneToOneField resolves to ColumnModelLink with view read", () => {
            const field = { name: "profile", typeSerializer: "PrimaryKeyRelatedField", typeModel: "OneToOneField" };
            expect(resolveColumnComponent(field)).toBe(availableColumns.ColumnModelLink);
            expect(resolveColumnProps(field)).toEqual({ view: "read" });
        });

        scopedIt("a columnProps override can supply app/model alongside the type default view", () => {
            const field = { name: "category", typeSerializer: "PrimaryKeyRelatedField", typeModel: "ForeignKey" };
            expect(resolveColumnProps(field, { category: { app: "catalog", model: "widgetcategory" } })).toEqual({
                view: "read",
                app: "catalog",
                model: "widgetcategory",
            });
        });
    });

    describe("to-many type defaults", () => {
        // The field descriptors carry the server's real model-info types for each to-many field.
        const toManyFields = toManyPayloads.map((payload) => [
            payload.scenario,
            {
                name: payload.field,
                typeSerializer: payload.model_info.type_serializer,
                typeModel: payload.model_info.type_model,
            },
        ]);

        scopedIt.each(toManyFields)("%s resolves to ColumnModelLinks with view read", (_, field) => {
            expect(resolveColumnComponent(field)).toBe(availableColumns.ColumnModelLinks);
            expect(resolveColumnProps(field)).toEqual({ view: "read" });
        });

        scopedIt.each(toManyFields)("%s uses a view-prop column override in place of the default", (_, field) => {
            expect(resolveColumnComponent(field, { [field.name]: CustomColumn })).toBe(CustomColumn);
        });

        scopedIt.each(toManyFields)("%s uses a model-config column override in place of the default", (_, field) => {
            expect(resolveColumnComponent(field, undefined, { [field.name]: "ColumnText" })).toBe(
                availableColumns.ColumnText,
            );
        });
    });

    describe("resolveColumnProps layering", () => {
        scopedIt("returns an empty object when nothing supplies props", () => {
            expect(resolveColumnProps({ name: "a" })).toEqual({});
        });

        scopedIt("layers type default, config, then prop overrides", () => {
            columnMappings.CharField = {
                CharField: { column: "ColumnText", columnProps: { base: 1, shared: "type" }, default: true },
            };
            const field = { name: "a", typeSerializer: "CharField", typeModel: "CharField" };
            const props = resolveColumnProps(field, { a: { shared: "prop" } }, { a: { shared: "config", mid: 2 } });
            expect(props).toEqual({ base: 1, mid: 2, shared: "prop" });
        });
    });

    describe("resolveColumns", () => {
        scopedIt("resolves a map keyed by field name", () => {
            const result = resolveColumns({
                fields: [
                    { name: "a", typeSerializer: "CharField" },
                    { name: "b", typeSerializer: "CharField" },
                ],
            });
            expect(Object.keys(result)).toEqual(["a", "b"]);
            expect(result.a.component).toBe(availableColumns.ColumnText);
            expect(result.a.props).toEqual({});
        });

        scopedIt("contains a column whose override names no component", () => {
            const result = resolveColumns({
                fields: [{ name: "a" }, { name: "b" }],
                propComponents: { a: "ColumnNope" },
                propProps: { a: { extra: "EX" } },
            });
            expect(result.a.component).toBeNull();
            expect(result.a.props).toEqual({});
            expect(result.a.error.message).toBe('No column component named "ColumnNope" for column "a"');
            expect(result.b.component).toBe(availableColumns.ColumnText);
            expect(result.b.error).toBeUndefined();
        });

        scopedIt("skips fields without a name", () => {
            const result = resolveColumns({ fields: [{ typeSerializer: "CharField" }, null, { name: "b" }] });
            expect(Object.keys(result)).toEqual(["b"]);
        });

        scopedIt("tolerates missing fields list", () => {
            expect(resolveColumns()).toEqual({});
            expect(resolveColumns({})).toEqual({});
        });
    });
});
