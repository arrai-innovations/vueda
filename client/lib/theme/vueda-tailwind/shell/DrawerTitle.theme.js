/**
 * @module theme/vueda-tailwind/shell/DrawerTitle.theme
 *
 * Per-component theme registration for DrawerTitle. Imported as a side effect by
 * DrawerTitle.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the DrawerTitle slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DrawerTitle styles the heading for a drawer.
     */
    DrawerTitle: {
        /**
         * The primary heading inside a drawer. It uses foreground semibold text without page-title scaling.
         */
        root: {
            class: "text-foreground font-semibold",
        },
    },
});
