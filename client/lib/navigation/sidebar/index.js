import { cva } from "class-variance-authority";

export { default as NavigationSidebar } from "./NavigationSidebar.vue";
export { default as NavigationSidebarContent } from "./NavigationSidebarContent.vue";
export { default as NavigationSidebarFooter } from "./NavigationSidebarFooter.vue";
export { default as NavigationSidebarGroup } from "./NavigationSidebarGroup.vue";
export { default as NavigationSidebarGroupAction } from "./NavigationSidebarGroupAction.vue";
export { default as NavigationSidebarGroupContent } from "./NavigationSidebarGroupContent.vue";
export { default as NavigationSidebarGroupLabel } from "./NavigationSidebarGroupLabel.vue";
export { default as NavigationSidebarHeader } from "./NavigationSidebarHeader.vue";
export { default as NavigationSidebarInput } from "./NavigationSidebarInput.vue";
export { default as NavigationSidebarInset } from "./NavigationSidebarInset.vue";
export { default as NavigationSidebarMenu } from "./NavigationSidebarMenu.vue";
export { default as NavigationSidebarMenuAction } from "./NavigationSidebarMenuAction.vue";
export { default as NavigationSidebarMenuBadge } from "./NavigationSidebarMenuBadge.vue";
export { default as NavigationSidebarMenuButton } from "./NavigationSidebarMenuButton.vue";
export { default as NavigationSidebarMenuButtonChild } from "./NavigationSidebarMenuButtonChild.vue";
export { default as NavigationSidebarMenuItem } from "./NavigationSidebarMenuItem.vue";
export { default as NavigationSidebarMenuSkeleton } from "./NavigationSidebarMenuSkeleton.vue";
export { default as NavigationSidebarMenuSub } from "./NavigationSidebarMenuSub.vue";
export { default as NavigationSidebarMenuSubButton } from "./NavigationSidebarMenuSubButton.vue";
export { default as NavigationSidebarMenuSubItem } from "./NavigationSidebarMenuSubItem.vue";
export { default as NavigationSidebarProvider } from "./NavigationSidebarProvider.vue";
export { default as NavigationSidebarRail } from "./NavigationSidebarRail.vue";
export { default as NavigationSidebarSeparator } from "./NavigationSidebarSeparator.vue";
export { default as NavigationSidebarTrigger } from "./NavigationSidebarTrigger.vue";

export { useSidebar } from "./utils.js";

/**
 * CVA variants for the sidebar menu button.
 * @type {import('class-variance-authority').VariantProps<typeof sidebarMenuButtonVariants>}
 */
export const sidebarMenuButtonVariants = cva(
    "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                outline:
                    "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
            },
            size: {
                default: "h-8 text-sm",
                sm: "h-7 text-xs",
                lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);
