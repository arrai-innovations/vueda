/**
 * @module theme/vueda-tailwind/navigation/SidebarMenuButtonChild.theme
 *
 * Per-component theme registration for SidebarMenuButtonChild. Imported as a side effect by
 * SidebarMenuButtonChild.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarMenuButtonChild styles the interactive button content used by sidebar menu items.
     */
    SidebarMenuButtonChild: {
        /** Primary sidebar menu button content. Active state uses a rail and icon tint, not a type-weight bump, so hover does not shift label width. */
        root: ({ variant, size }) => ({
            class: [
                // Layout and spacing.
                "peer/menu-button relative flex w-full items-center gap-2 rounded-vueda-control p-2 text-left text-sm",

                // Interactive states.
                "transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                "focus-visible:focus-ring focus-visible:focus-ring-sidebar active:bg-sidebar-accent-active active:text-sidebar-accent-foreground",

                // Disabled and action states.
                "disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8",
                "aria-disabled:pointer-events-none aria-disabled:opacity-50",

                // Active and open states.
                "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
                "data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground",

                // Collapsed state.
                "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",

                // Icons and child elements.
                "[&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",

                // Active rail.
                "data-[active=true]:before:absolute data-[active=true]:before:inset-y-0 data-[active=true]:before:left-0",
                "data-[active=true]:before:w-(--vueda-sidebar-active-rail) data-[active=true]:before:bg-sidebar-primary data-[active=true]:before:content-['']",
                "group-data-[collapsible=icon]:data-[active=true]:before:-left-2",
                "data-[active=true]:[&>svg]:text-sidebar-primary",

                // Variant classes. The neutral hover (bg / text) is applied
                // unconditionally above, so only the outline-specific surface and
                // shadow-hover need to be expressed per-variant here.
                {
                    "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]":
                        variant === "outline",
                },

                // Size classes. Default text size (text-sm) comes from the base above;
                // only the sm tier overrides it (text-xs).
                {
                    "h-8": !size || size === "default",
                    "h-7 text-xs": size === "sm",
                    "h-12 group-data-[collapsible=icon]:p-0!": size === "lg",
                },
            ],
        }),
    },
});
