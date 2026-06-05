/**
 * @module theme/vueda-tailwind/shell/DialogContent.theme
 *
 * Per-component theme registration for DialogContent. Imported as a side effect by
 * DialogContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DialogContent styles the centered modal surface and close affordance.
     */
    DialogContent: {
        /**
         * The centered dialog surface. It uses the modal surface recipe, fixed viewport centering, overlay shadow, and enter or exit animation for standard modal dialogs.
         */
        root: {
            class: "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-vueda-modal border p-6 shadow-vueda-overlay duration-200 sm:max-w-lg",
        },
        /**
         * The close control inside the dialog surface. It stays low-emphasis until hover or focus and uses the shared ring color for keyboard focus.
         */
        close: {
            class: "data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none text-sm leading-none",
        },
    },
});
