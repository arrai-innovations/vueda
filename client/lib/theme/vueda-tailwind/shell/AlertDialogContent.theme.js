/**
 * @module theme/vueda-tailwind/shell/AlertDialogContent.theme
 *
 * Per-component theme registration for AlertDialogContent. Imported as a side effect by
 * AlertDialogContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertDialogContent styles the modal surface and overlay for destructive or consequential confirmations.
     */
    AlertDialogContent: {
        /**
         * The centered alert dialog surface. It uses the modal radius, overlay shadow, fixed viewport centering, and entrance or exit motion expected for blocking confirmations.
         */
        root: {
            class: [
                // Surface and motion.
                "bg-background text-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",

                // Positioning and layout.
                "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4",

                // Shape and elevation.
                "rounded-vueda-modal overlay-hairline overlay-hairline-elevated p-6 duration-200 sm:max-w-lg",
            ],
        },
        /**
         * The alert dialog backdrop. It fills the viewport with the shared overlay color and fades with the same open or closed state as the dialog surface.
         */
        overlay: {
            class: [
                // Motion and state.
                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",

                // Positioning and surface.
                "fixed inset-0 z-50 bg-overlay",
            ],
        },
    },
});
