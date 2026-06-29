/**
 * @module theme/vueda-tailwind/objects-grid/ObjectsGridTableHeader.theme
 *
 * Per-component theme registration for ObjectsGridTableHeader. Imported as a
 * side effect by ObjectsGridTableHeader.vue, so a route chunk that pulls only
 * that SFC drags only this component's theme entry, not the entire objects-grid
 * family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Column header content for the table layout inside `ObjectsGrid`. Shows the
     * field label. Headers are not interactive: sorting is driven from the
     * toolbar Sort control and the active-sort chips, not the column headers.
     */
    ObjectsGridTableHeader: {
        /** The header content wrapper. It lays out the label and the numeric-column reversal used when the parent header cell carries `data-numeric`. */
        root: {
            class: ["flex", "items-end", "justify-between", "py-1 px-2", "[[data-numeric]_&]:flex-row-reverse"],
        },
        /** The header label text slot. It remains unstyled by default so field-specific header slots can inherit the surrounding table header rhythm. */
        label: {
            class: {},
        },
    },
});
