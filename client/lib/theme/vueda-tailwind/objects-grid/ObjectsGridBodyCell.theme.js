/**
 * @module theme/vueda-tailwind/objects-grid/ObjectsGridBodyCell.theme
 *
 * Per-component theme registration for ObjectsGridBodyCell. Imported as a side
 * effect by ObjectsGridBodyCell.vue and ObjectsGridBodyCellSkeleton.vue, so a
 * route chunk that pulls only those SFCs drags only this component's theme
 * entry, not the entire objects-grid family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Data cell for the table layout inside `ObjectsGrid`. Provides table cell
     * alignment, density-driven height, numeric alignment, and field-value
     * slot styling.
     */
    ObjectsGridBodyCell: {
        /** The table-layout field cell. It provides density-aware row height, numeric and mono alignment hooks, and the foreground text treatment for value slots. Density tiers map default, compact, and condensed rows to progressively tighter row heights. */
        root: {
            class: [
                // Table cell layout and type.
                "align-middle",
                "text-foreground",
                "font-normal",
                "px-1 lg:px-2",
                "table-cell",
                "whitespace-nowrap",

                // Density tiers.
                "[[data-density=default]_&]:h-8 [[data-density=default]_&]:py-1.5",
                "[[data-density=compact]_&]:h-7 [[data-density=compact]_&]:py-1",
                "[[data-density=condensed]_&]:h-6 [[data-density=condensed]_&]:py-0.5",
                "[[data-density=condensed]_&]:text-xs",

                // Numeric and mono alignment.
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
});
