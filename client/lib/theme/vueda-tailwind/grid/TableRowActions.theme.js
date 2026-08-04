/**
 * @module theme/vueda-tailwind/grid/TableRowActions.theme
 *
 * Per-component theme registration for TableRowActions. Imported as a side
 * effect by TableRowActions.vue, so a route chunk that pulls only that SFC
 * drags only this component's theme entry, not the entire grid family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
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
            class: [
                "inline-flex gap-0.5 invisible",
                "[tr:hover_&]:visible [tr:focus-within_&]:visible [tr[data-state=selected]_&]:visible",
            ],
        },
        /**
         * The canonical action button class exposed to the default slot as `actionClass`. Apply it to small icon buttons so row actions share the same hover surface, border, and focus ring as other table controls.
         */
        action: {
            class: [
                "inline-flex items-center justify-center size-6 rounded-vueda-control",
                "border border-transparent text-muted-foreground text-[11px]",
                "hover:bg-muted hover:text-foreground hover:border-border active:bg-accent-active",
                "focus-visible:outline-none focus-visible:hairline-ring focus-visible:focus-ring-shadow",
            ],
        },
    },
});
