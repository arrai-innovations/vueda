/**
 * @module theme/vueda-tailwind/navigation/SidebarMenu.theme
 *
 * Per-component theme registration for SidebarMenu. Imported as a side effect by
 * SidebarMenu.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the SidebarMenu slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarMenu arranges sidebar menu items in a vertical list.
     */
    SidebarMenu: {
        /** Vertical menu list with narrow gaps for dense sidebar navigation. */
        root: {
            class: "flex w-full min-w-0 flex-col gap-1",
        },
    },
});
