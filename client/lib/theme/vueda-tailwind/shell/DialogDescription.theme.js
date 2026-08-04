/**
 * @module theme/vueda-tailwind/shell/DialogDescription.theme
 *
 * Per-component theme registration for DialogDescription. Imported as a side effect by
 * DialogDescription.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DialogDescription styles supporting text inside a dialog.
     */
    DialogDescription: {
        /**
         * The supporting copy below a dialog title. It uses muted small text so detail remains subordinate to the title and body content.
         */
        root: {
            class: "text-muted-foreground text-sm",
        },
    },
});
