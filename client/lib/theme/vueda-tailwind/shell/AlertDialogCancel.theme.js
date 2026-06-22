/**
 * @module theme/vueda-tailwind/shell/AlertDialogCancel.theme
 *
 * Per-component theme registration for AlertDialogCancel. Imported as a side effect by
 * AlertDialogCancel.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import "@vueda/theme/vueda-tailwind/controls/_ButtonPrimitives.theme.js";
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertDialogCancel styles the secondary dismissal action inside an alert dialog.
     */
    AlertDialogCancel: {
        /**
         * The secondary dismissal button in an alert dialog. It composes the outline Button recipe and adds mobile spacing for stacked footer layouts.
         */
        root: {
            composes: ["_ButtonBase.root", "_ButtonOutline.root"],
            class: ["mt-2 sm:mt-0"],
        },
    },
});
