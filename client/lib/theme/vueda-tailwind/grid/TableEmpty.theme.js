/**
 * @module theme/vueda-tailwind/grid/TableEmpty.theme
 *
 * Per-component theme registration for TableEmpty. Imported as a side effect by
 * TableEmpty.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire grid family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Empty-state row for tables. Spans the configured column count and
     * centers consumer-provided icon, title, copy, and action content.
     */
    TableEmpty: {
        /**
         * The spanning empty-state cell. It keeps the row aligned with regular {@api theme-key:TableCell.root} cells while allowing `colspan` and consumer classes to define the empty row's table footprint.
         */
        root: {
            class: "p-4 whitespace-nowrap align-middle text-body text-foreground",
        },
        /**
         * The centered content stack inside the empty cell. Consumer icon nodes marked `data-slot="icon"` pick up muted, loading, or error treatment from `data-variant`.
         */
        content: {
            class: [
                "flex flex-col items-center justify-center gap-2.5 py-10 text-center text-muted-foreground",
                "[&>[data-slot=icon]]:text-xl [&>[data-slot=icon]]:text-muted-foreground/70",
                "data-[variant=loading]:[&>[data-slot=icon]]:animate-spin",
                "data-[variant=error]:[&>[data-slot=icon]]:text-destructive/80",
            ],
        },
    },
});
