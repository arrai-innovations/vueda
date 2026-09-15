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
         * The `<tfoot>` section wrapper for summary and total rows. Its muted fill and top divider separate aggregates from body rows while leaving row cells free to handle numeric alignment. The divider sits on the first footer row's cells, and the last footer row drops its own divider, because the separated border model does not paint borders on `<tfoot>` or `<tr>`.
         */
        root: {
            class: [
                "bg-muted/50 text-muted-foreground font-medium",
                "[&>tr:first-child>*]:border-t-hairline [&>tr:last-child>*]:border-b-0",
            ],
        },
    },
});
