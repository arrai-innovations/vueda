/**
 * @module theme/vueda-tailwind/navigation/SidebarMenu.theme
 *
 * Per-component theme registration for SidebarMenu. Imported as a side effect by
 * SidebarMenu.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
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
