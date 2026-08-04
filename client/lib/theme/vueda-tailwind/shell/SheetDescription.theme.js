/**
 * @module theme/vueda-tailwind/shell/SheetDescription.theme
 *
 * Per-component theme registration for SheetDescription. Imported as a side effect by
 * SheetDescription.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SheetDescription styles supporting text inside a sheet.
     */
    SheetDescription: {
        /**
         * The supporting copy inside a sheet. It uses muted small text to stay subordinate to the sheet title and body content.
         */
        root: {
            class: "text-muted-foreground text-sm",
        },
    },
});
