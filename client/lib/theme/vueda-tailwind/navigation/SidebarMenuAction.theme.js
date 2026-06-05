/**
 * @module theme/vueda-tailwind/navigation/SidebarMenuAction.theme
 *
 * Per-component theme registration for SidebarMenuAction. Imported as a side effect by
 * SidebarMenuAction.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarMenuAction styles a trailing action button attached to a sidebar menu item.
     */
    SidebarMenuAction: {
        /** Trailing menu-item action. `showOnHover` defers visibility until hover, focus-within, or open state on desktop. */
        root: ({ showOnHover }) => ({
            class: [
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-vueda-control p-0 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring [&>svg]:size-4 [&>svg]:shrink-0",
                "after:absolute after:-inset-2 md:after:hidden",
                "peer-data-[size=sm]/menu-button:top-1",
                "peer-data-[size=default]/menu-button:top-1.5",
                "peer-data-[size=lg]/menu-button:top-2.5",
                "group-data-[collapsible=icon]:hidden",
                {
                    "peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0":
                        showOnHover,
                },
            ],
        }),
    },
});
