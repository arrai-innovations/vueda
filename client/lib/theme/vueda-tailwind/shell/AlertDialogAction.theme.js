/**
 * @module theme/vueda-tailwind/shell/AlertDialogAction.theme
 *
 * Per-component theme registration for AlertDialogAction. Imported as a side effect by
 * AlertDialogAction.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertDialogAction contributes alert-dialog-specific classes to the Button it renders internally.
     */
    AlertDialogAction: {
        /**
         * Extra classes for the Button rendered inside AlertDialogAction. Button owns the tone, emphasis, size, focus, and disabled recipes; this slot is intentionally empty by default so the wrapper cannot drift from the button contract.
         */
        root: {
            class: [],
        },
    },
});
