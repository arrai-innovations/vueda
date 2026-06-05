/**
 * @module theme/vueda-tailwind/grid/TableFooter.theme
 *
 * Per-component theme registration for TableFooter. Imported as a side effect
 * by TableFooter.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire grid family.
 *
 * Prototype-phase duplication: this entry mirrors the TableFooter slice of
 * grid/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Footer section for table summaries or totals. Provides the muted surface
     * and top edge that separate aggregate rows from body content.
     */
    TableFooter: {
        /**
         * The `<tfoot>` section wrapper for summary and total rows. Its muted fill and top divider separate aggregates from body rows while leaving row cells free to handle numeric alignment.
         */
        root: {
            class: "bg-muted/50 text-muted-foreground border-t font-medium [&>tr]:last:border-b-0",
        },
    },
});
