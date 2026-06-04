/**
 * @module theme/vueda-tailwind/shell/AlertDialogAction.theme
 *
 * Per-component theme registration for AlertDialogAction. Imported as a side effect by
 * AlertDialogAction.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the AlertDialogAction slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import "@vueda/theme/vueda-tailwind/controls/_ButtonPrimitives.theme.js";
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertDialogAction styles the primary action inside a blocking confirmation dialog.
     */
    AlertDialogAction: {
        /**
         * The primary confirmation button in an alert dialog. It composes the default Button recipe so blocking confirmations keep the same focus, height, and CTA treatment as regular primary actions.
         */
        root: {
            composes: ["_ButtonBase.root", "_ButtonDefault.root"],
            class: [],
        },
    },
});
