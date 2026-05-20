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
        container: {
            class: "relative w-full overflow-auto rounded-vueda-card border border-border bg-card data-[sticky]:overflow-y-auto data-[sticky]:max-h-[var(--vueda-tbl-max-h,30rem)]",
        },
        table: {
            class: "w-full caption-bottom text-body border-separate border-spacing-0 [font-variant-numeric:tabular-nums_slashed-zero]",
        },
    },

    /**
     * Table body section for rendered data rows. Keeps the final row from
     * painting a duplicate bottom edge inside the table container.
     */
    TableBody: {
        root: {
            class: "[&_tr:last-child]:border-0",
        },
    },

    /**
     * Native table caption for supporting text below a table. Uses the muted
     * body-text treatment shared by data-grid helper copy.
     */
    TableCaption: {
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
        root: {
            class: "p-4 whitespace-nowrap align-middle text-body text-foreground",
        },
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
        root: {
            class: "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        },
    },

    /**
     * Header cell primitive for table columns. Carries the density, sticky
     * header, numeric alignment, and checkbox offset rules used by `Table`.
     */
    TableHead: {
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
        root: {
            class: "[&_tr]:border-b",
        },
    },

    /**
     * Row primitive for table body and header sections. Provides hover chrome,
     * selected-row tinting, and the standard bottom divider.
     */
    TableRow: {
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
        root: {
            class: "inline-flex gap-0.5 invisible [tr:hover_&]:visible [tr:focus-within_&]:visible [tr[data-state=selected]_&]:visible",
        },
        action: {
            class: "inline-flex items-center justify-center size-6 rounded-vueda-control border border-transparent text-muted-foreground text-[11px] hover:bg-muted hover:text-foreground hover:border-border focus-visible:outline-none focus-visible:hairline-ring focus-visible:focus-ring-shadow",
        },
    },
};
