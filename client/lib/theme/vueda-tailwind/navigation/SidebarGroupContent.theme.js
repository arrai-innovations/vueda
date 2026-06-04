/**
 * @module theme/vueda-tailwind/navigation/SidebarGroupContent.theme
 *
 * Per-component theme registration for SidebarGroupContent. Imported as a side effect by
 * SidebarGroupContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the SidebarGroupContent slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarGroupContent wraps the body of a sidebar group.
     */
    SidebarGroupContent: {
        /** Full-width body area for controls inside a sidebar group. */
        root: {
            class: "w-full text-sm",
        },
    },
});
