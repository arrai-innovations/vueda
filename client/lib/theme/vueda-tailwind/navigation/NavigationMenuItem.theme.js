/**
 * @module theme/vueda-tailwind/navigation/NavigationMenuItem.theme
 *
 * Per-component theme registration for NavigationMenuItem. Imported as a side effect by
 * NavigationMenuItem.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the NavigationMenuItem slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * NavigationMenuItem wraps one top-level navigation menu entry.
     */
    NavigationMenuItem: {
        /** Positioning wrapper for one top-level navigation menu entry and its content. */
        root: {
            class: "relative",
        },
    },
});
