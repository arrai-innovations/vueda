/**
 * @module theme/vueda-tailwind/navigation/SidebarTrigger.theme
 *
 * Per-component theme registration for SidebarTrigger. Imported as a side effect by
 * SidebarTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the SidebarTrigger slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarTrigger styles the compact control that toggles the sidebar.
     */
    SidebarTrigger: {
        /** Compact sidebar toggle button. The glyph is supplied through the icon registry. */
        root: {
            class: "h-7 w-7",
        },
    },
});
