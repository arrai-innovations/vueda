/**
 * @module theme/vueda-tailwind/navigation/SidebarGroupAction.theme
 *
 * Per-component theme registration for SidebarGroupAction. Imported as a side effect by
 * SidebarGroupAction.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the SidebarGroupAction slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarGroupAction styles a compact action button aligned with a sidebar group header.
     */
    SidebarGroupAction: {
        /** Compact header action aligned to a group label. Hidden in icon-collapsed mode. */
        root: {
            class: [
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-vueda-control p-0 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring [&>svg]:size-4 [&>svg]:shrink-0",
                "after:absolute after:-inset-2 md:after:hidden",
                "group-data-[collapsible=icon]:hidden",
            ],
        },
    },
});
