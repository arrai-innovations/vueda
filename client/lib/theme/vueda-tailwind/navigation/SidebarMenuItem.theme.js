/**
 * @module theme/vueda-tailwind/navigation/SidebarMenuItem.theme
 *
 * Per-component theme registration for SidebarMenuItem. Imported as a side effect by
 * SidebarMenuItem.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the SidebarMenuItem slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarMenuItem wraps one item in a sidebar menu.
     */
    SidebarMenuItem: {
        /** Relative wrapper that scopes peer selectors for buttons, badges, and trailing actions. */
        root: {
            class: "group/menu-item relative",
        },
    },
});
