/**
 * @module theme/vueda-tailwind/shell/SheetTitle.theme
 *
 * Per-component theme registration for SheetTitle. Imported as a side effect by
 * SheetTitle.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SheetTitle styles the heading for a sheet.
     */
    SheetTitle: {
        /**
         * The primary heading inside a sheet. It uses foreground semibold text without page-title scaling.
         */
        root: {
            class: "text-foreground font-semibold",
        },
    },
});
