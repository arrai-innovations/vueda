/**
 * @module theme/vueda-tailwind/objects-grid/ObjectsGrid.theme
 *
 * Per-component theme registration for ObjectsGrid. Imported as a side effect
 * by ObjectsGrid.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire objects-grid family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Dual-mode object list that switches between table layout and card-grid
     * layout at the configured breakpoint. Owns the shared card surface, empty
     * state, row states, card layout, and row-action affordances.
     */
    ObjectsGrid: {
        /** The outer scroll surface and card chrome for the grid. It owns the density attribute, tabular number rendering, and `data-flush` edge merging used when the grid is embedded in a parent surface. `data-flush` strips the embedded grid's border and radius so only the parent container's edge remains visible. */
        root: {
            class: [
                "max-w-full overflow-x-auto",
                "rounded-vueda-card border bg-card text-foreground text-body",
                "[font-variant-numeric:tabular-nums_slashed-zero]",
                // Flush variant: an ancestor stamps `data-flush="true"` (e.g. FieldSetTabularInline.body)
                // to merge the grid into a parent card without doubling borders. Drop the rounded edge
                // and side/top borders, keep a single bottom hairline as the seam to chrome below.
                "[[data-flush]_&]:rounded-none [[data-flush]_&]:border-x-0 [[data-flush]_&]:border-t-0",
            ],
        },
        /** The inner table-shaped container. It switches on the table display contract only when the active breakpoint resolves to table layout. */
        table: {
            class: ({ isTable }) => [
                {
                    "!table border-separate border-spacing-0": isTable,
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
        /** The table-layout column header cell. It aligns numeric columns with `data-numeric` so sortable columns keep their right edge stable. */
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
        /** The empty-state content stack. It styles the icon, title, and variant-driven loading or error treatment used by the default empty slot. */
        emptyContent: {
            class: [
                "flex flex-col items-center justify-center gap-2.5 py-10 text-center text-muted-foreground",
                "[&>[data-slot=icon]]:text-xl [&>[data-slot=icon]]:text-muted-foreground/70",
                // Variant icon states.
                "data-[variant=loading]:[&>[data-slot=icon]]:animate-spin",
                "data-[variant=error]:[&>[data-slot=icon]]:text-destructive/80",
            ],
        },
        /** The body row group for loading, empty, and data rows. It is a responsive card grid in card layout and a table row group in table layout. */
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
        /** The shared row wrapper for table rows and card rows. It carries hover, selected, and marked-destroy states while preserving action controls. Selected rows use a low-primary tint plus a leading primary rail so selection stays distinct from hover. */
        bodyRow: {
            class: ({ isTable }) => {
                return [
                    "group/row transition-colors",
                    "hover:bg-accent/50 active:bg-accent",

                    // Selected row state.
                    "data-[state=selected]:bg-primary/[0.06]",
                    "data-[state=selected]:hover:bg-primary/[0.09]",
                    "data-[state=selected]:active:bg-primary/[0.12]",
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
                        "p-1 2xs:p-2 2xl:p-4 rounded-vueda-card border overflow-y-auto": !isTable,
                    },
                ];
            },
        },
        /** The card-layout field grid inside each row card. It aligns all {@api theme-key:ObjectsGridCardCell.header} and {@api theme-key:ObjectsGridCardCell.value} fragments into label and value columns. */
        cardContainer: {
            class: [
                // Card spacing.
                "p-1 2xs:p-2 2xl:p-4 gap-1 2xs:gap-2 2xl:gap-4 mb-1 mt-2",

                // Aligned label / value columns within a card: each ObjectsGridCardCell renders as a
                // header + value fragment (no wrapping root), so its two children participate directly
                // in this grid -- equivalent to a `display: contents` cell wrapper without the wrapper.
                "grid grid-cols-[minmax(96px,max-content)_1fr] items-baseline",
                "[&>*]:min-w-0",
            ],
        },
        /** Row-action classes exposed for consumers that compose inline row controls next to object rows. Use `rowActions.root` for the hidden wrapper and `rowActions.action` for compact icon buttons. */
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
                    "hover:bg-muted hover:text-foreground hover:border-border active:bg-accent-active",
                    "focus-visible:outline-none focus-visible:hairline-ring focus-visible:focus-ring-shadow",
                ],
            },
        },
    },
});
