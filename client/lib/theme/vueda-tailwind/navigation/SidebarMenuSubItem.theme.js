/**
 * @module theme/vueda-tailwind/navigation/SidebarMenuSubItem.theme
 *
 * Per-component theme registration for SidebarMenuSubItem. Imported as a side effect by
 * SidebarMenuSubItem.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarMenuSubItem wraps one nested sidebar menu item.
     */
    SidebarMenuSubItem: {
        /** Relative wrapper for one nested sidebar menu item. */
        root: {
            class: "group/menu-sub-item relative",
        },
    },
});
