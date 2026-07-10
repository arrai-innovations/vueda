/**
 * @module theme/vueda-tailwind/shell/AlertDialogCancel.theme
 *
 * Per-component theme registration for AlertDialogCancel. Imported as a side effect by
 * AlertDialogCancel.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertDialogCancel contributes alert-dialog-specific classes to the Button it renders internally.
     */
    AlertDialogCancel: {
        /**
         * Extra classes for the Button rendered inside AlertDialogCancel. Button owns the tone, emphasis, size, focus, and disabled recipes; this slot only adds mobile spacing for the stacked alert-dialog footer layout.
         */
        root: {
            class: ["mt-2 sm:mt-0"],
        },
    },
});
