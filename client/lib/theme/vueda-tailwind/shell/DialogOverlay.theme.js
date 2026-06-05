/**
 * @module theme/vueda-tailwind/shell/DialogOverlay.theme
 *
 * Per-component theme registration for DialogOverlay. Imported as a side effect by
 * DialogOverlay.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DialogOverlay styles the backdrop behind dialog surfaces.
     */
    DialogOverlay: {
        /**
         * The dialog backdrop layer. It fills the viewport with the shared overlay token and fades with dialog state changes.
         */
        root: {
            class: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-overlay",
        },
    },
});
