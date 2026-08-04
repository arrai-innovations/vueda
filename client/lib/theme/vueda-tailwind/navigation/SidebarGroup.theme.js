/**
 * @module theme/vueda-tailwind/navigation/SidebarGroup.theme
 *
 * Per-component theme registration for SidebarGroup. Imported as a side effect by
 * SidebarGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarGroup provides a section container for related sidebar controls.
     */
    SidebarGroup: {
        /** Section wrapper that provides local padding and positioning for group labels and actions. */
        root: {
            class: "relative flex w-full min-w-0 flex-col p-2",
        },
    },
});
