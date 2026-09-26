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

        scopedIt("ignores an unknown string key and falls through", () => {
            const component = resolveColumnComponent({ name: "a" }, { a: "ColumnNope" });
            expect(component).toBe(availableColumns.ColumnText);
        });

        scopedIt("calls a () => component override for its component, as the form chain does", () => {
            const component = resolveColumnComponent({ name: "a" }, { a: () => CustomColumn });
            expect(component).toBe(CustomColumn);
        });

        scopedIt("falls through when a () => component override returns nothing", () => {
            const component = resolveColumnComponent({ name: "a" }, { a: () => undefined }, { a: CustomColumn });
            expect(component).toBe(CustomColumn);
        });

        scopedIt("falls through from an unknown prop string key to the config override", () => {
            const component = resolveColumnComponent({ name: "a" }, { a: "ColumnNope" }, { a: CustomColumn });
            expect(component).toBe(CustomColumn);
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
