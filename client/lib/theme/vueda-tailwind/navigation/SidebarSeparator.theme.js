/**
 * @module theme/vueda-tailwind/navigation/SidebarSeparator.theme
 *
 * Per-component theme registration for SidebarSeparator. Imported as a side effect by
 * SidebarSeparator.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the SidebarSeparator slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarSeparator renders a divider between sidebar sections.
     */
    SidebarSeparator: {
        /** Full-bleed sidebar divider. It avoids inset hairlines so section breaks do not read as notches. */
        root: {
            class: "bg-sidebar-border my-1",
        },
    },
});
