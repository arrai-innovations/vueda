/**
 * @module theme/vueda-tailwind/shell/AlertDialogContent.theme
 *
 * Per-component theme registration for AlertDialogContent. Imported as a side effect by
 * AlertDialogContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the AlertDialogContent slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
            class: "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-vueda-modal border p-6 shadow-vueda-overlay duration-200 sm:max-w-lg",
        },
        /**
         * The alert dialog backdrop. It fills the viewport with the shared overlay color and fades with the same open or closed state as the dialog surface.
         */
        overlay: {
            class: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-overlay",
        },
    },
});
