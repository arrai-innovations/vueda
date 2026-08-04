/**
 * @module theme/vueda-tailwind/navigation/SidebarMenuItem.theme
 *
 * Per-component theme registration for SidebarMenuItem. Imported as a side effect by
 * SidebarMenuItem.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
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
