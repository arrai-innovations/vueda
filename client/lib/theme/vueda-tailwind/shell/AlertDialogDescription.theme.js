/**
 * @module theme/vueda-tailwind/shell/AlertDialogDescription.theme
 *
 * Per-component theme registration for AlertDialogDescription. Imported as a side effect by
 * AlertDialogDescription.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the AlertDialogDescription slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertDialogDescription styles supporting copy that explains the confirmation.
     */
    AlertDialogDescription: {
        /**
         * The supporting copy below an alert dialog title. It uses muted small text so consequence detail supports the title without competing with the action buttons.
         */
        root: {
            class: "text-muted-foreground text-sm",
        },
    },
});
