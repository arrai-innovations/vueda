/**
 * @module theme/vueda-tailwind/grid/Table.theme
 *
 * Per-component theme registration for Table. Imported as a side effect by
 * Table.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire grid family.
 */
import { patchTheme } from "@vueda/theme/vueda-tailwind/registry.js";

patchTheme({
    /**
     * Scrollable table shell for data-grid surfaces. Provides the outer
     * container and table element that descendants use for density and sticky
     * header variants.
     */
    Table: {
        /**
         * The card surface around the scroll container: fill, radius, and {@api css-token:vueda-hairline-width} edge. Its padding matches the edge width, so the scroll container sits inside the painted edge and no row or sticky header cell can cover it.
         */
        frame: {
            class: [
                "relative w-full",
                "rounded-vueda-card hairline hairline-border bg-card p-[var(--vueda-hairline-width)]",
            ],
        },
        /**
         * The scroll container around the native table, inside {@api theme-key:Table.frame}. It owns horizontal overflow and the sticky-table height cap used when `Table` receives `sticky`. Its radius is the card radius less the edge width, so scrolled content clips to the inside of the frame's corners.
         */
        container: {
            class: [
                "relative w-full overflow-auto",
                "rounded-[calc(var(--vueda-card-radius)-var(--vueda-hairline-width))]",
                "data-[sticky]:overflow-y-auto data-[sticky]:max-h-[var(--vueda-tbl-max-h,30rem)]",
            ],
        },
        /**
         * The native `<table>` element. It carries the numeric font features, border model, and `data-density` hook that {@api theme-key:TableHead.root} and {@api theme-key:TableCell.root} read. Density tiers map default, compact, and condensed rows to progressively tighter row heights.
         */
        table: {
            class: [
                "w-full caption-bottom text-body",
                "border-separate border-spacing-0",
                "[font-variant-numeric:tabular-nums_slashed-zero]",
            ],
        },
    },
});
