/**
 * @module theme/vueda-tailwind/navigation
 * @description Tailwind CSS theme configuration for VUEDA Client navigation primitives.
 */
import { BUTTON_BASE, BUTTON_VARIANT_GHOST, BUTTON_VARIANT_OUTLINE } from "@vueda/theme/vueda-tailwind/_shared.js";

export default {
    NavigationPaginationItem: {
        root: ({ isActive }) => ({
            class: [
                ...BUTTON_BASE,
                {
                    [BUTTON_VARIANT_OUTLINE]: isActive,
                    [BUTTON_VARIANT_GHOST]: !isActive,
                },
            ],
        }),
    },
    NavigationPaginationNavButton: {
        root: {
            class: [...BUTTON_BASE, BUTTON_VARIANT_GHOST, "gap-1 px-2.5 sm:pr-2.5"],
        },
    },
    NavigationPaginationContent: {
        root: {
            class: "flex flex-row items-center gap-1",
        },
    },
    NavigationPaginationEllipsis: {
        root: {
            class: "flex size-9 items-center justify-center",
        },
    },
    NavigationPagination: {
        root: {
            class: "mx-auto flex w-full justify-center",
        },
    },
    NavigationSidebarContent: {
        root: {
            class: "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        },
    },
    NavigationSidebarFooter: {
        root: {
            class: "flex flex-col gap-2 p-2",
        },
    },
    NavigationSidebarGroupContent: {
        root: {
            class: "w-full text-sm",
        },
    },
    NavigationSidebarGroup: {
        root: {
            class: "relative flex w-full min-w-0 flex-col p-2",
        },
    },
    NavigationSidebarHeader: {
        root: {
            class: "flex flex-col gap-2 p-2",
        },
    },
    NavigationSidebarInput: {
        root: {
            class: "bg-background h-8 w-full shadow-none",
        },
    },
    NavigationSidebarMenuItem: {
        root: {
            class: "group/menu-item relative",
        },
    },
    NavigationSidebarMenuSub: {
        root: {
            class: [
                "border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5",
                "group-data-[collapsible=icon]:hidden",
            ],
        },
    },
    NavigationSidebarMenuSubItem: {
        root: {
            class: "group/menu-sub-item relative",
        },
    },
    NavigationSidebarMenu: {
        root: {
            class: "flex w-full min-w-0 flex-col gap-1",
        },
    },
    NavigationSidebarGroupAction: {
        root: {
            class: [
                "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
                "after:absolute after:-inset-2 md:after:hidden",
                "group-data-[collapsible=icon]:hidden",
            ],
        },
    },
    NavigationSidebarGroupLabel: {
        root: {
            class: [
                "text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
                "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
            ],
        },
    },
    NavigationSidebarInset: {
        root: {
            class: [
                "bg-background relative flex w-full flex-1 flex-col",
                "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
            ],
        },
    },
    NavigationSidebarMenuBadge: {
        root: {
            class: [
                "text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none",
                "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
                "peer-data-[size=sm]/menu-button:top-1",
                "peer-data-[size=default]/menu-button:top-1.5",
                "peer-data-[size=lg]/menu-button:top-2.5",
                "group-data-[collapsible=icon]:hidden",
            ],
        },
    },
    NavigationSidebarRail: {
        root: {
            class: [
                "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex",
                "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
                "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
                "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full",
                "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
                "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
            ],
        },
    },
    NavigationSidebarSeparator: {
        root: {
            class: "bg-sidebar-border mx-2 w-auto",
        },
    },
    NavigationSidebarTrigger: {
        root: {
            class: "h-7 w-7",
        },
    },
    NavigationSidebarMenuAction: {
        root: ({ showOnHover }) => ({
            class: [
                "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
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
    NavigationSidebarMenuSubButton: {
        root: ({ size }) => ({
            class: [
                "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
                "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
                { "text-xs": size === "sm", "text-sm": size === "md" },
                "group-data-[collapsible=icon]:hidden",
            ],
        }),
    },
    NavigationSidebarMenuSkeleton: {
        root: {
            class: "flex h-8 items-center gap-2 rounded-md px-2",
        },
    },
    NavigationSidebarProvider: {
        root: {
            class: "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
        },
    },
    NavigationSidebar: {
        rootNone: {
            class: "bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col",
        },
        spacer: ({ variant }) => ({
            class: [
                "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
                "group-data-[collapsible=offcanvas]:w-0",
                "group-data-[side=right]:rotate-180",
                {
                    "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]":
                        variant === "floating" || variant === "inset",
                    "group-data-[collapsible=icon]:w-(--sidebar-width-icon)":
                        variant !== "floating" && variant !== "inset",
                },
            ],
        }),
        panel: ({ side, variant }) => ({
            class: [
                "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
                {
                    "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]": side === "left",
                    "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]":
                        side === "right",
                },
                {
                    "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]":
                        variant === "floating" || variant === "inset",
                    "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l":
                        variant !== "floating" && variant !== "inset",
                },
            ],
        }),
    },
    NavigationSidebarMenuButtonChild: {
        root: ({ variant, size }) => ({
            class: [
                "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
                {
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground": !variant || variant === "default",
                    "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]":
                        variant === "outline",
                },
                {
                    "h-8 text-sm": !size || size === "default",
                    "h-7 text-xs": size === "sm",
                    "h-12 text-sm group-data-[collapsible=icon]:p-0!": size === "lg",
                },
            ],
        }),
    },
};
