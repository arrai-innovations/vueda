/**
 * @module theme/vueda-tailwind/shell/AlertDialogFooter.theme
 *
 * Per-component theme registration for AlertDialogFooter. Imported as a side effect by
 * AlertDialogFooter.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the AlertDialogFooter slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertDialogFooter arranges alert dialog actions with mobile-first stacking.
     */
    AlertDialogFooter: {
        /**
         * The action row for an alert dialog. It stacks buttons in reverse order on narrow screens and aligns them to the end once horizontal space is available.
         */
        root: {
            class: "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        },
    },
});
