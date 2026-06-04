/**
 * @module theme/vueda-tailwind/shell/DialogHeader.theme
 *
 * Per-component theme registration for DialogHeader. Imported as a side effect by
 * DialogHeader.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the DialogHeader slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DialogHeader groups dialog title and description content.
     */
    DialogHeader: {
        /**
         * The title and description stack at the top of a dialog. It centers copy on narrow screens and switches to left alignment at the small breakpoint.
         */
        root: {
            class: "flex flex-col gap-2 text-center sm:text-left",
        },
    },
});
