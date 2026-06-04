/**
 * @module theme/vueda-tailwind/grid/TableHeader.theme
 *
 * Per-component theme registration for TableHeader. Imported as a side effect
 * by TableHeader.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire grid family.
 *
 * Prototype-phase duplication: this entry mirrors the TableHeader slice of
 * grid/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Table header section. Adds the row-level bottom edge that separates the
     * column header band from body rows.
     */
    TableHeader: {
        /**
         * The `<thead>` section wrapper. It paints the row-level divider under header rows so sticky {@api theme-key:TableHead.root} cells retain a clear boundary above scrolling body content.
         */
        root: {
            class: "[&_tr]:border-b",
        },
    },
});
