/**
 * @module theme/vueda-tailwind/grid/TableCell.theme
 *
 * Per-component theme registration for TableCell. Imported as a side effect by
 * TableCell.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire grid family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Body cell primitive for grid rows. Handles density-driven height,
     * numeric and monospaced alignment, checkbox offsets, and whitespace
     * preservation.
     */
    TableCell: {
        /**
         * The body cell slot for `<td>` elements. It applies the density tiers from {@api theme-key:Table.table}, keeps checkbox columns compact, and honors `data-numeric` or `data-mono` directly on the cell.
         */
        root: {
            class: [
                "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
                "[[data-density=default]_&]:h-8 [[data-density=default]_&]:py-1.5",
                "[[data-density=compact]_&]:h-7 [[data-density=compact]_&]:py-1",
                "[[data-density=condensed]_&]:h-6 [[data-density=condensed]_&]:py-0.5 [[data-density=condensed]_&]:text-xs",
                "data-[numeric]:text-right data-[numeric]:font-mono",
                "data-[mono]:font-mono",
            ],
        },
    },
});
