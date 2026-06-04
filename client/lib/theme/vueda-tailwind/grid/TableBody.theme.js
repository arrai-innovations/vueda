/**
 * @module theme/vueda-tailwind/grid/TableBody.theme
 *
 * Per-component theme registration for TableBody. Imported as a side effect by
 * TableBody.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire grid family.
 *
 * Prototype-phase duplication: this entry mirrors the TableBody slice of
 * grid/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Table body section for rendered data rows. Keeps the final row from
     * painting a duplicate bottom edge inside the table container.
     */
    TableBody: {
        /**
         * The `<tbody>` section wrapper. It removes the last row divider so the enclosing {@api theme-key:Table.container} border remains the closing edge instead of doubling the table bottom.
         */
        root: {
            class: "[&_tr:last-child]:border-0",
        },
    },
});
