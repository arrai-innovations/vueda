/**
 * @module theme/vueda-tailwind/navigation/SidebarMenuSkeleton.theme
 *
 * Per-component theme registration for SidebarMenuSkeleton. Imported as a side effect by
 * SidebarMenuSkeleton.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarMenuSkeleton styles placeholder rows while sidebar menu content loads.
     */
    SidebarMenuSkeleton: {
        /** Placeholder menu row that aligns loading content with normal sidebar menu button geometry. */
        root: {
            class: "flex h-8 items-center gap-2 rounded-md px-2",
        },
    },
});
