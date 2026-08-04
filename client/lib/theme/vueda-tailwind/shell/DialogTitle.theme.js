/**
 * @module theme/vueda-tailwind/shell/DialogTitle.theme
 *
 * Per-component theme registration for DialogTitle. Imported as a side effect by
 * DialogTitle.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DialogTitle styles the heading for a dialog.
     */
    DialogTitle: {
        /**
         * The primary heading for a dialog. It uses compact semibold type sized for modal content, not page-level display text.
         */
        root: {
            class: "text-lg leading-none font-semibold",
        },
    },
});
