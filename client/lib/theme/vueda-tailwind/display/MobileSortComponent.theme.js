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
     * MobileSortComponent is the bottom-drawer shell around SortEditor. It owns only the drawer chrome; the reorderable field list and action bar are themed by SortEditor.
     */
    MobileSortComponent: {
        /** Drawer height override for the mobile sorting workflow. */
        drawer: {
            class: ["!h-auto"],
        },
    },
});
