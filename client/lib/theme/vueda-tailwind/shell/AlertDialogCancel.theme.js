/**
 * @module theme/vueda-tailwind/shell/AlertDialogCancel.theme
 *
 * Per-component theme registration for AlertDialogCancel. Imported as a side effect by
 * AlertDialogCancel.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the AlertDialogCancel slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import "@vueda/theme/vueda-tailwind/controls/_ButtonPrimitives.theme.js";
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertDialogCancel styles the secondary dismissal action inside an alert dialog.
     */
    AlertDialogCancel: {
        /**
         * The secondary dismissal button in an alert dialog. It composes the outline Button recipe and adds mobile spacing for stacked footer layouts.
         */
        root: {
            composes: ["_ButtonBase.root", "_ButtonOutline.root"],
            class: ["mt-2 sm:mt-0"],
        },
    },
});
