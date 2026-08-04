/**
 * @module theme/vueda-tailwind/navigation/SidebarSeparator.theme
 *
 * Per-component theme registration for SidebarSeparator. Imported as a side effect by
 * SidebarSeparator.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarSeparator renders a divider between sidebar sections.
     */
    SidebarSeparator: {
        /** Full-bleed sidebar divider. It avoids inset hairlines so section breaks do not read as notches. */
        root: {
            class: "bg-sidebar-border my-1",
        },
    },
});
