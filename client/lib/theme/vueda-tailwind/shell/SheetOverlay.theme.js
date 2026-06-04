/**
 * @module theme/vueda-tailwind/shell/SheetOverlay.theme
 *
 * Per-component theme registration for SheetOverlay. Imported as a side effect by
 * SheetOverlay.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the SheetOverlay slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SheetOverlay styles the backdrop behind sheet surfaces.
     */
    SheetOverlay: {
        /**
         * The sheet backdrop layer. It fills the viewport with the shared overlay token and fades with sheet state changes.
         */
        root: {
            class: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-overlay",
        },
    },
});
