/**
 * @module theme/vueda-tailwind/shell/SheetTitle.theme
 *
 * Per-component theme registration for SheetTitle. Imported as a side effect by
 * SheetTitle.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the SheetTitle slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SheetTitle styles the heading for a sheet.
     */
    SheetTitle: {
        /**
         * The primary heading inside a sheet. It uses foreground semibold text without page-title scaling.
         */
        root: {
            class: "text-foreground font-semibold",
        },
    },
});
