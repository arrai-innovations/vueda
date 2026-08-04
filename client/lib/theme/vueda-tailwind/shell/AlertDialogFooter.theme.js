/**
 * @module theme/vueda-tailwind/shell/AlertDialogFooter.theme
 *
 * Per-component theme registration for AlertDialogFooter. Imported as a side effect by
 * AlertDialogFooter.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertDialogFooter arranges alert dialog actions with mobile-first stacking.
     */
    AlertDialogFooter: {
        /**
         * The action row for an alert dialog. It stacks buttons in reverse order on narrow screens and aligns them to the end once horizontal space is available.
         */
        root: {
            class: "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        },
    },
});
