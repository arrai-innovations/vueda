/**
 * @module theme/vueda-tailwind/shell/Separator.theme
 *
 * Per-component theme registration for Separator. Imported as a side effect by
 * Separator.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Separator styles horizontal and vertical rules used to divide content.
     */
    Separator: {
        /**
         * The plain horizontal or vertical dividing rule. It is a single border-token line with no label or inset variant.
         */
        root: {
            class: "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        },
    },
});
