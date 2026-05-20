/**
 * @module theme/vueda-tailwind/objects-grid
 * @description Tailwind CSS pass-through theme configuration for VUEDA Client ObjectsGrid and related table/card components.
 */

export default {
    // ---------- Objects grid ----------

    /**
     * Dual-mode object list that switches between table layout and card-grid
     * layout at the configured breakpoint. Owns the shared card surface, empty
     * state, row states, card layout, and row-action affordances.
     */
    ObjectsGrid: {
        /** The outer scroll surface and card chrome for the grid. It owns the density attribute, tabular number rendering, and `data-flush` edge merging used when the grid is embedded in a parent surface; see DESIGN.md § 8.1 and § Tables and grids. */
        root: {
            class: [
                "max-w-full overflow-x-auto",
                "rounded-vueda-card border border-border bg-card text-foreground text-body",
                "[font-variant-numeric:tabular-nums_slashed-zero]",
                // Flush variant: an ancestor stamps `data-flush="true"` (e.g. FieldSetTabularInline.body)
                // to merge the grid into a parent card without doubling borders. Drop the rounded edge
                // and side/top borders, keep a single bottom hairline as the seam to chrome below.
                "[[data-flush]_&]:rounded-none [[data-flush]_&]:border-x-0 [[data-flush]_&]:border-t-0",
            ],
        },
        /** The inner table-shaped container. It switches on the table display contract only when the active breakpoint resolves to table layout; see DESIGN.md § Tables and grids. */
        table: {
            class: ({ isTable }) => [
                {
                    "!table border-separate border-spacing-0 overflow-x-auto max-w-full": isTable,
                },
            ],
        },
        /** The header row group for table layout. It is hidden in card layout because card labels come from {@api theme-key:ObjectsGridCardCell.header}. */
        headerRowGroup: {
            class: ({ isTable }) => [
                "gap-1 2xs:gap-2 2xl:gap-4",
                {
                    "!table-header-group": isTable,
                    hidden: !isTable,
                },
            ],
        },
        /** The table-layout header row wrapper. It becomes a table row only when {@api theme-key:ObjectsGrid.table} is in table mode. */
        headerRow: {
            class: ({ isTable }) => [{ "!table-row": isTable }],
        },
        /** The table-layout column header cell. It aligns numeric columns with `data-numeric` so sortable columns keep their right edge stable; see DESIGN.md § 8.1. */
        headerCell: {
            class: ({ isTable }) => [
                "align-bottom",
                "font-semibold",
                "select-none",
                "data-[numeric]:text-right",
                {
                    "!table-cell": isTable,
                },
            ],
        },
        /** The empty-state cell wrapper. It centers the empty content inside the single full-width row created when the grid has no data. */
        emptyText: {
            class: ["text-center"],
        },
        /** The empty-state content stack. It styles the icon, title, and variant-driven loading or error treatment used by the default empty slot; see DESIGN.md § Tables and grids. */
        emptyContent: {
            class: [
                "flex flex-col items-center justify-center gap-2.5 py-10 text-center text-muted-foreground",
                "[&>[data-slot=icon]]:text-xl [&>[data-slot=icon]]:text-muted-foreground/70",
                "data-[variant=loading]:[&>[data-slot=icon]]:animate-spin",
                "data-[variant=error]:[&>[data-slot=icon]]:text-destructive/80",
            ],
        },
        /** The body row group for loading, empty, and data rows. It is a responsive card grid in card layout and a table row group in table layout; see DESIGN.md § Tables and grids. */
        bodyRowGroup: {
            class: ({ isTable }) => [
                "print:block",
                {
                    // 1 / 2 / 3 column responsive default; projects override via theme as needed.
                    "grid grid-flow-row grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 p-1 2xs:p-2 2xl:p-4 gap-1 2xs:gap-2 2xl:gap-4":
                        !isTable,
                    "!table-row-group": isTable,
                },
            ],
        },
        /** The shared row wrapper for table rows and card rows. It carries hover, selected, and marked-destroy states while preserving action controls; see DESIGN.md § 2.3 and § Tables and grids. */
        bodyRow: {
            class: ({ isTable }) => {
                return [
                    "group/row transition-colors",
                    "hover:bg-muted/50",
                    "data-[state=selected]:bg-primary/[0.06] data-[state=selected]:hover:bg-primary/[0.09]",
                    "data-[state=selected]:[box-shadow:inset_2px_0_0_0_var(--primary)]",
                    // marked-destroy: 4% destructive tint and a strikethrough on every cell whose
                    // `data-field` / `data-card` / `data-card-header` is not the action column. Action
                    // controls are excluded so the user can still click "undo" on the destroy mark.
                    "data-[state=marked-destroy]:bg-destructive/[0.04]",
                    "data-[state=marked-destroy]:[&_[data-field]:not([data-field=item-action-bar])]:line-through",
                    "data-[state=marked-destroy]:[&_[data-card]:not([data-card=item-action-bar])]:line-through",
                    "data-[state=marked-destroy]:[&_[data-card-header]:not([data-card-header=item-action-bar])]:line-through",
                    // you can't tell how many cards are on a row, so we must treat them all the same.
                    // first and last don't help us here.
                    {
                        "!table-row": isTable,
                        "p-1 2xs:p-2 2xl:p-4 rounded-vueda-card border border-border overflow-y-auto": !isTable,
                    },
                ];
            },
        },
        /** The card-layout field grid inside each row card. It aligns all {@api theme-key:ObjectsGridCardCell.header} and {@api theme-key:ObjectsGridCardCell.value} fragments into label and value columns; see DESIGN.md § Tables and grids. */
        cardContainer: {
            class: [
                "p-1 2xs:p-2 2xl:p-4 gap-1 2xs:gap-2 2xl:gap-4 mb-1 mt-2",
                // Aligned label / value columns within a card: each ObjectsGridCardCell renders as a
                // header + value fragment (no wrapping root), so its two children participate directly
                // in this grid -- equivalent to a `display: contents` cell wrapper without the wrapper.
                "grid grid-cols-[minmax(96px,max-content)_1fr] items-baseline",
                "[&>*]:min-w-0",
            ],
        },
        /** Row-action classes exposed for consumers that compose inline row controls next to object rows. Use `rowActions.root` for the hidden wrapper and `rowActions.action` for compact icon buttons; see DESIGN.md § Tables and grids. */
        rowActions: {
            /** The row-action container. It stays invisible at rest so dense grids do not read as a column of icons. */
            root: {
                class: [
                    "inline-flex gap-0.5 invisible",
                    "group-hover/row:visible group-focus-within/row:visible group-data-[state=selected]/row:visible",
                ],
            },
            /** The canonical compact icon-button action inside a row action bar. It keeps a 24px target, muted resting color, hover border, and focus ring consistent with dense table actions. */
            action: {
                class: [
                    "inline-flex items-center justify-center size-6 rounded-vueda-control",
                    "border border-transparent text-muted-foreground text-[11px]",
                    "hover:bg-muted hover:text-foreground hover:border-border",
                    "focus-visible:outline-none focus-visible:hairline-ring focus-visible:focus-ring-shadow",
                ],
            },
        },
    },

    /**
     * Column header content for the table layout inside `ObjectsGrid`. Shows
     * the field label, sortable hover affordance, sort icon slot, and
     * multi-sort priority chip.
     */
    ObjectsGridTableHeader: {
        /** The interactive header content wrapper. It lays out the label, sort icon, and numeric-column reversal used when the parent header cell carries `data-numeric`; see DESIGN.md § 8.1. */
        root: {
            class: ({ props: { sortable } }) => [
                "flex",
                "items-end",
                "justify-between",
                "py-1 px-2",
                "[[data-numeric]_&]:flex-row-reverse",
                {
                    "cursor-pointer": sortable,
                    "hover:bg-accent hover:text-accent-foreground": sortable,
                    "hover:rounded": sortable,
                },
            ],
        },
        /** The header label text slot. It remains unstyled by default so field-specific header slots can inherit the surrounding table header rhythm. */
        label: {
            class: {},
        },
        /** The sort icon wrapper beside the header label. It adds a small leading offset while numeric headers reverse the parent flex direction to keep sort state from shifting the right edge. */
        sortIcon: {
            class: ["pl-1", "text-center"],
        },
        /** The multi-sort priority chip. It uses compact mono numerals to show sort precedence without competing with the field label; see DESIGN.md § Tables and grids. */
        multiSortNumber: {
            class: [
                "inline-flex items-center justify-center",
                "min-w-[14px] h-[14px] px-1 ml-1 rounded-vueda-control",
                "bg-[color-mix(in_oklab,var(--muted-foreground)_18%,transparent)] text-muted-foreground",
                "font-mono text-[9px] font-semibold tracking-[0.04em]",
            ],
        },
    },

    /**
     * Label and value fragment for a single field in the card layout inside
     * `ObjectsGrid`. The component has no wrapper, so its header and value
     * participate directly in the parent card grid.
     */
    ObjectsGridCardCell: {
        /** The card-layout field label fragment. It renders as a compact muted micro-label that participates directly in {@api theme-key:ObjectsGrid.cardContainer}; see DESIGN.md § Tables and grids. */
        header: {
            class: [
                "self-baseline whitespace-nowrap",
                "text-[10px] font-semibold uppercase tracking-[0.06em]",
                "text-muted-foreground",
                "select-none",
            ],
        },
        /** The card-layout field value fragment. It aligns on the same baseline as the header and uses foreground body text for the row's readable data. */
        value: {
            class: ["self-baseline", "text-[13px] font-normal text-foreground"],
        },
    },

    /**
     * Data cell for the table layout inside `ObjectsGrid`. Provides table cell
     * alignment, density-driven height, numeric alignment, and field-value
     * slot styling.
     */
    ObjectsGridBodyCell: {
        /** The table-layout field cell. It provides density-aware row height, numeric and mono alignment hooks, and the foreground text treatment for value slots; see DESIGN.md § 4.3 and § 8.1. */
        root: {
            class: [
                "align-middle",
                "text-foreground",
                "font-normal",
                "px-1 lg:px-2",
                "table-cell",
                "whitespace-nowrap",
                "[[data-density=default]_&]:h-8 [[data-density=default]_&]:py-1.5",
                "[[data-density=compact]_&]:h-7 [[data-density=compact]_&]:py-1",
                "[[data-density=condensed]_&]:h-6 [[data-density=condensed]_&]:py-0.5 [[data-density=condensed]_&]:text-xs",
                "data-[numeric]:text-right data-[numeric]:font-mono",
                "data-[mono]:font-mono",
            ],
        },
        /** Local child-theme adjustment for widgets rendered inside table cells. It removes the default {@api theme-key:WidgetLabel.root} margin so inline cell labels align with grid density. */
        themeOverride: {
            WidgetLabel: {
                root: {
                    class: {
                        "ml-2 mb-1": false,
                    },
                },
            },
        },
    },
};
