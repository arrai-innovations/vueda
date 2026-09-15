/**
 * @module theme/vueda-tailwind/grid/TableHeader.theme
 *
 * Per-component theme registration for TableHeader. Imported as a side effect
 * by TableHeader.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire grid family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Table header section. The edge between the header band and body rows
     * comes from the header row's own {@api theme-key:TableRow.root} divider.
     */
    TableHeader: {
        /**
         * The `<thead>` section wrapper. Empty by default: header cells take their bottom divider from {@api theme-key:TableRow.root}, and because that border belongs to the cell, a sticky {@api theme-key:TableHead.root} carries it over scrolling body content.
         */
        root: {
            class: "",
        },
    },
});
