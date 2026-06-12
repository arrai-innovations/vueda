/**
 * @module theme/vueda-tailwind/navigation/SidebarGroupAction.theme
 *
 * Per-component theme registration for SidebarGroupAction. Imported as a side effect by
 * SidebarGroupAction.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
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
                // Surface and interactive states.
                "text-sidebar-foreground hover:bg-sidebar-accent active:bg-sidebar-accent-active hover:text-sidebar-accent-foreground",

                // Positioning and layout.
                "absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-vueda-control p-0",

                // Motion and focus.
                "transition-transform focus-visible:focus-ring focus-visible:focus-ring-sidebar",

                // Icons and child elements.
                "[&>svg]:size-4 [&>svg]:shrink-0",

                // Hit area and collapsed state.
                "after:absolute after:-inset-2 md:after:hidden",
                "group-data-[collapsible=icon]:hidden",
            ],
        },
    },
});
