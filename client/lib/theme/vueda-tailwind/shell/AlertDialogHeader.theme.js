/**
 * @module theme/vueda-tailwind/shell/AlertDialogHeader.theme
 *
 * Per-component theme registration for AlertDialogHeader. Imported as a side effect by
 * AlertDialogHeader.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the AlertDialogHeader slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertDialogHeader groups the title and description at the top of an alert dialog.
     */
    AlertDialogHeader: {
        /**
         * The title and description stack at the top of an alert dialog. It centers copy on narrow screens and switches to left alignment at the small breakpoint.
         */
        root: {
            class: "flex flex-col gap-2 text-center sm:text-left",
        },
    },
});
