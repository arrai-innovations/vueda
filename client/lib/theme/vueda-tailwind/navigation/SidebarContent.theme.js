/**
 * @module theme/vueda-tailwind/navigation/SidebarContent.theme
 *
 * Per-component theme registration for SidebarContent. Imported as a side effect by
 * SidebarContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the SidebarContent slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarContent provides the scrollable main content region inside a sidebar.
     */
    SidebarContent: {
        /** Scrollable main sidebar region. Icon-collapsed mode hides overflow so labels do not bleed past the rail. */
        root: {
            class: "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        },
    },
});
