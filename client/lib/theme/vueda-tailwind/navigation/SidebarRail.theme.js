/**
 * @module theme/vueda-tailwind/navigation/SidebarRail.theme
 *
 * Per-component theme registration for SidebarRail. Imported as a side effect by
 * SidebarRail.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarRail styles the click target along the edge of a collapsible sidebar.
     */
    SidebarRail: {
        /** Edge hit target for toggling collapsed state. */
        root: {
            class: [
                // Hit target and base layout.
                "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 cursor-pointer",

                // Motion and side states.
                "transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0",

                // Edge indicator.
                "after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex",

                // Offcanvas states.
                "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0",
                "group-data-[collapsible=offcanvas]:after:left-full",
                "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
                "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
            ],
        },
    },
});
