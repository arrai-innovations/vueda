/**
 * @module theme/vueda-tailwind/feedback/Sonner.theme
 *
 * Per-component theme registration for Sonner. Imported as a side effect by
 * Sonner.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire feedback family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Sonner provides the theme hook for the toast viewport integration. The root class establishes the toaster group consumed by the Sonner library.
     */
    Sonner: {
        /**
         * The toast viewport theme hook passed to vue-sonner. It establishes the toaster group while toast surface, type tint, and icon resolution stay controlled by the wrapper component and Sonner rules.
         */
        root: {
            class: "toaster group",
        },
    },
});
