/**
 * @module theme/vueda-tailwind/shell/AlertDialogDescription.theme
 *
 * Per-component theme registration for AlertDialogDescription. Imported as a side effect by
 * AlertDialogDescription.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertDialogDescription styles supporting copy that explains the confirmation.
     */
    AlertDialogDescription: {
        /**
         * The supporting copy below an alert dialog title. It uses muted small text so consequence detail supports the title without competing with the action buttons.
         */
        root: {
            class: "text-muted-foreground text-sm",
        },
    },
});
