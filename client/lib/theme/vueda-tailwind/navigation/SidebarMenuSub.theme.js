/**
 * @module theme/vueda-tailwind/navigation/SidebarMenuSub.theme
 *
 * Per-component theme registration for SidebarMenuSub. Imported as a side effect by
 * SidebarMenuSub.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarMenuSub styles nested menu lists inside a sidebar menu item.
     */
    SidebarMenuSub: {
        /** Nested list rail and indentation for submenu items. Icon-collapsed mode hides the nested list. */
        root: {
            class: [
                "border-sidebar-border mx-3 flex min-w-0 translate-x-px flex-col gap-1 border-l-hairline px-2.5 py-0.5",
                "group-data-[collapsible=icon]:hidden",
            ],
        },
    },
});
