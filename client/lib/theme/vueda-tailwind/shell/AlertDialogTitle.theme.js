/**
 * @module theme/vueda-tailwind/shell/AlertDialogTitle.theme
 *
 * Per-component theme registration for AlertDialogTitle. Imported as a side effect by
 * AlertDialogTitle.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the AlertDialogTitle slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertDialogTitle styles the heading for an alert dialog.
     */
    AlertDialogTitle: {
        /**
         * The primary heading for an alert dialog. It uses a compact semibold heading treatment sized for modal content, not page-level display text.
         */
        root: {
            class: "text-lg font-semibold",
        },
    },
});
