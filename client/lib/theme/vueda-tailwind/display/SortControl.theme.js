/**
 * @module theme/vueda-tailwind/display/SortControl.theme
 *
 * Per-component theme registration for SortControl. Imported as a side effect by
 * SortControl.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SortControl is the toolbar entry point for multi-field sorting. Its trigger
     * carries the active-sort count and opens the shared SortEditor in a popover
     * on desktop or a full-screen dialog on mobile.
     */
    SortControl: {
        /** Active-sort count badge on the trigger. Mirrors the FilterMenu badge so the Filters / Sort pair reads as matched. */
        badge: {
            class: [
                "ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground",
            ],
        },
        /** Full-screen mobile dialog surface with a fixed header row and a bounded body row. */
        dialog: {
            class: ["grid-rows-[auto_minmax(0,1fr)] overflow-hidden"],
        },
        /** Visible mobile dialog header; right padding leaves room for the built-in close control. */
        dialogHeader: {
            class: ["border-b px-4 py-4 pr-12"],
        },
        /** Padded scrolling region below the fixed mobile dialog header. */
        dialogBody: {
            class: ["min-h-0 overflow-y-auto overscroll-contain p-4"],
        },
    },
});
