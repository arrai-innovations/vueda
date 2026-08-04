/**
 * @module theme/vueda-tailwind/shell/AlertDialogHeader.theme
 *
 * Per-component theme registration for AlertDialogHeader. Imported as a side effect by
 * AlertDialogHeader.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertDialogHeader groups the title and description at the top of an alert dialog.
     */
    AlertDialogHeader: {
        /**
         * The title and description stack at the top of an alert dialog. It centers copy on narrow screens and switches to left alignment at the small breakpoint.
         */
        root: {
            class: "flex flex-col gap-2 text-center sm:text-left",
        },
    },
});
