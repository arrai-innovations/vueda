/**
 * @module theme/vueda-tailwind/navigation/SidebarGroupContent.theme
 *
 * Per-component theme registration for SidebarGroupContent. Imported as a side effect by
 * SidebarGroupContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarGroupContent wraps the body of a sidebar group.
     */
    SidebarGroupContent: {
        /** Full-width body area for controls inside a sidebar group. */
        root: {
            class: "w-full text-sm",
        },
    },
});
