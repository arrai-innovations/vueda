/**
 * @module theme/vueda-tailwind/shell/DialogScrollContent.theme
 *
 * Per-component theme registration for DialogScrollContent. Imported as a side effect by
 * DialogScrollContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DialogScrollContent styles a modal surface that can scroll within an overlay.
     */
    DialogScrollContent: {
        /**
         * The scrollable dialog surface. It stays centered inside the scroll overlay while preserving the modal radius, border, and overlay shadow used by dialog surfaces.
         */
        root: {
            class: "relative z-50 grid w-full max-w-lg my-8 gap-4 border bg-background p-6 shadow-vueda-overlay duration-200 sm:rounded-vueda-modal md:w-full",
        },
        /**
         * The scrollable dialog overlay. It both paints the backdrop and provides a grid centering context with vertical overflow for tall modal content.
         */
        overlay: {
            class: "fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-overlay data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        },
        /**
         * The close control for scrollable dialog content. It is positioned inside the modal surface and uses a secondary hover fill instead of changing layout.
         */
        close: {
            class: "absolute top-4 right-4 p-0.5 transition-colors rounded-md hover:bg-secondary",
        },
    },
});
