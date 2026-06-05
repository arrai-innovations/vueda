/**
 * @module theme/vueda-tailwind/grid/Table.theme
 *
 * Per-component theme registration for Table. Imported as a side effect by
 * Table.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire grid family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Scrollable table shell for data-grid surfaces. Provides the outer
     * container and table element that descendants use for density and sticky
     * header variants.
     */
    Table: {
        /**
         * The scroll container around the native table. It owns the card surface, horizontal overflow, and sticky-table height cap used when `Table` receives `sticky`.
         */
        container: {
            class: "relative w-full overflow-auto rounded-vueda-card border border-border bg-card data-[sticky]:overflow-y-auto data-[sticky]:max-h-[var(--vueda-tbl-max-h,30rem)]",
        },
        /**
         * The native `<table>` element. It carries the numeric font features, border model, and `data-density` hook that {@api theme-key:TableHead.root} and {@api theme-key:TableCell.root} read. Density tiers map default, compact, and condensed rows to progressively tighter row heights.
         */
        table: {
            class: "w-full caption-bottom text-body border-separate border-spacing-0 [font-variant-numeric:tabular-nums_slashed-zero]",
        },
    },
});
