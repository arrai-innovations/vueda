/**
 * @module theme/vueda-tailwind/display/MobileSortComponent.theme
 *
 * Per-component theme registration for MobileSortComponent. Imported as a side effect by
 * MobileSortComponent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * MobileSortComponent is the full-screen dialog shell around SortEditor. It owns only the dialog chrome; the reorderable field list and action bar are themed by SortEditor.
     */
    MobileSortComponent: {
        /** Full-screen dialog surface with a fixed header row and a bounded body row. */
        dialog: {
            class: ["grid-rows-[auto_minmax(0,1fr)] overflow-hidden"],
        },
        /** Visible dialog header; right padding leaves room for the built-in close control. */
        dialogHeader: {
            class: ["border-b px-4 py-4 pr-12"],
        },
        /** Padded scrolling region below the fixed dialog header. */
        dialogBody: {
            class: ["min-h-0 overflow-y-auto overscroll-contain p-4"],
        },
    },
});
