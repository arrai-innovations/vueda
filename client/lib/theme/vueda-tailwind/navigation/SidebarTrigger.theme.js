/**
 * @module theme/vueda-tailwind/navigation/SidebarTrigger.theme
 *
 * Per-component theme registration for SidebarTrigger. Imported as a side effect by
 * SidebarTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarTrigger styles the compact control that toggles the sidebar.
     */
    SidebarTrigger: {
        /** Compact sidebar toggle button. The glyph is supplied through the icon registry. */
        root: {
            class: "h-7 w-7",
        },
    },
});
