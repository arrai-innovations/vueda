/**
 * @module theme/vueda-tailwind/navigation/SidebarInset.theme
 *
 * Per-component theme registration for SidebarInset. Imported as a side effect by
 * SidebarInset.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarInset styles the main content wrapper that sits beside or within a sidebar layout.
     */
    SidebarInset: {
        /** Main content wrapper adjacent to the sidebar. Inset variant chrome exists in source but is not the admin-app default. */
        root: {
            class: [
                // Layout and surface.
                "bg-background text-foreground relative flex min-w-0 flex-1 flex-col",

                // Inset variant states.
                "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-vueda-card",
                "md:peer-data-[variant=inset]:shadow-vueda-card md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
            ],
        },
    },
});
