/**
 * @module theme/vueda-tailwind/navigation/SidebarHeader.theme
 *
 * Per-component theme registration for SidebarHeader. Imported as a side effect by
 * SidebarHeader.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarHeader styles header content placed at the top of a sidebar.
     */
    SidebarHeader: {
        /** Top sidebar section for brand, search, or primary navigation controls. */
        root: {
            class: "flex flex-col gap-2 p-2",
        },
    },
});
