/**
 * @module theme/vueda-tailwind/grid
 * @description Tailwind CSS theme configuration for VUEDA Client grid components.
 */

export default {
    // ---------- Table primitives ----------

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

    /**
     * Native table caption for supporting text below a table. Uses the muted
     * body-text treatment shared by data-grid helper copy.
     */
    TableCaption: {
        /**
         * The native caption below a table. Use it for low-emphasis supporting copy tied to the table, with spacing that keeps it visually outside the bordered data surface.
         */
        root: {
            class: "text-muted-foreground mt-4 text-body",
        },
    },

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
            ].join(" "),
        },
    },

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
            ].join(" "),
        },
    },

    /**
     * Footer section for table summaries or totals. Provides the muted surface
     * and top edge that separate aggregate rows from body content.
     */
    TableFooter: {
        /**
         * The `<tfoot>` section wrapper for summary and total rows. Its muted fill and top divider separate aggregates from body rows while leaving row cells free to handle numeric alignment.
         */
        root: {
            class: "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        },
    },

    /**
     * Header cell primitive for table columns. Carries the density, sticky
     * header, numeric alignment, and checkbox offset rules used by `Table`.
     */
    TableHead: {
        /**
         * The header cell slot for `<th>` elements. It owns compact header typography, density heights, sticky positioning, checkbox offsets, and numeric sort-icon ordering; see {@api theme-key:Table.table}.
         */
        root: {
            class: [
                "text-foreground h-10 px-2 text-left align-middle font-semibold text-[length:var(--vueda-text-supporting)] whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
                "[[data-density=compact]_&]:h-8",
                "[[data-density=condensed]_&]:h-7 [[data-density=condensed]_&]:text-[11px]",
                "data-[numeric]:text-right data-[numeric]:[&_[data-slot=sort-icon]]:order-first",
                "[[data-sticky]_&]:sticky [[data-sticky]_&]:top-0 [[data-sticky]_&]:z-2 [[data-sticky]_&]:bg-card [[data-sticky]_&]:[box-shadow:0_1px_0_0_var(--border)]",
            ].join(" "),
        },
    },

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

    /**
     * Row primitive for table body and header sections. Provides hover chrome,
     * selected-row tinting, and the standard bottom divider.
     */
    TableRow: {
        /**
         * The row slot shared by header, body, and footer sections. It provides hover feedback, selected-row tinting, the leading selected rail, and the standard divider.
         */
        root: {
            class: "hover:bg-muted/50 data-[state=selected]:bg-primary/[0.06] data-[state=selected]:hover:bg-primary/[0.09] data-[state=selected]:[box-shadow:inset_2px_0_0_0_var(--primary)] border-b transition-colors",
        },
    },

    /**
     * Inline action strip for rows. Stays hidden until the row is hovered,
     * focused within, or selected, and exposes the canonical small icon-button
     * class to its slot.
     */
    TableRowActions: {
        /**
         * The inline wrapper for row actions. It stays invisible until the row is hovered, focused within, or selected, keeping scan-heavy tables clear until actions are relevant.
         */
        root: {
            class: "inline-flex gap-0.5 invisible [tr:hover_&]:visible [tr:focus-within_&]:visible [tr[data-state=selected]_&]:visible",
        },
        /**
         * The canonical action button class exposed to the default slot as `actionClass`. Apply it to small icon buttons so row actions share the same hover surface, border, and focus ring as other table controls.
         */
        action: {
            class: "inline-flex items-center justify-center size-6 rounded-vueda-control border border-transparent text-muted-foreground text-[11px] hover:bg-muted hover:text-foreground hover:border-border focus-visible:outline-none focus-visible:hairline-ring focus-visible:focus-ring-shadow",
        },
    },
};
