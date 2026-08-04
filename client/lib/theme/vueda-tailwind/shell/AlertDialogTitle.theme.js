/**
 * @module theme/vueda-tailwind/shell/AlertDialogTitle.theme
 *
 * Per-component theme registration for AlertDialogTitle. Imported as a side effect by
 * AlertDialogTitle.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertDialogTitle styles the heading for an alert dialog.
     */
    AlertDialogTitle: {
        /**
         * The primary heading for an alert dialog. It uses a compact semibold heading treatment sized for modal content, not page-level display text.
         */
        root: {
            class: "text-lg font-semibold",
        },
    },
});
