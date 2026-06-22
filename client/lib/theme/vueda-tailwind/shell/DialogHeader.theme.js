/**
 * @module theme/vueda-tailwind/shell/DialogHeader.theme
 *
 * Per-component theme registration for DialogHeader. Imported as a side effect by
 * DialogHeader.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DialogHeader groups dialog title and description content.
     */
    DialogHeader: {
        /**
         * The title and description stack at the top of a dialog. It centers copy on narrow screens and switches to left alignment at the small breakpoint.
         */
        root: {
            class: "flex flex-col gap-2 text-center sm:text-left",
        },
    },
});
