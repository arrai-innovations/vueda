/**
 * @module theme/vueda-tailwind/grid/TableFooter.theme
 *
 * Per-component theme registration for TableFooter. Imported as a side effect
 * by TableFooter.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire grid family.
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
            class: "bg-muted/50 text-muted-foreground border-t-hairline font-medium [&>tr]:last:border-b-0",
        },
    },
});
