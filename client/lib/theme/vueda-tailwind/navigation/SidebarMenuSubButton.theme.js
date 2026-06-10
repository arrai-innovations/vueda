/**
 * @module theme/vueda-tailwind/navigation/SidebarMenuSubButton.theme
 *
 * Per-component theme registration for SidebarMenuSubButton. Imported as a side effect by
 * SidebarMenuSubButton.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarMenuSubButton styles interactive controls inside nested sidebar menu lists.
     */
    SidebarMenuSubButton: {
        /** Nested sidebar control. Active state paints the sidebar rail through {@api css-token:vueda-sidebar-active-rail}. */
        root: ({ size }) => ({
            class: [
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground relative flex min-w-0 -translate-x-px items-center gap-2 rounded-vueda-control px-2 focus-visible:focus-ring focus-visible:focus-ring-sidebar disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
                "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
                "data-[active=true]:before:absolute data-[active=true]:before:inset-y-0 data-[active=true]:before:left-[-11px] data-[active=true]:before:w-(--vueda-sidebar-active-rail) data-[active=true]:before:bg-sidebar-primary data-[active=true]:before:content-['']",
                { "h-6 text-xs": size === "sm", "h-7 text-sm": size === "md" },
                "group-data-[collapsible=icon]:hidden",
            ],
        }),
    },
});
