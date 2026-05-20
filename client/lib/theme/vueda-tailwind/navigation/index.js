/**
 * @module theme/vueda-tailwind/navigation
 * @description Tailwind CSS theme configuration for VUEDA Client navigation primitives.
 */

export default {
    // ---------- Breadcrumb ----------
    /**
     * Breadcrumb provides the root context for a trail of hierarchical navigation links.
     */
    Breadcrumb: { root: { class: "" } },
    /**
     * BreadcrumbList arranges breadcrumb items and separators in a wrapping inline row.
     */
    BreadcrumbList: {
        root: {
            class: "text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
        },
    },
    /**
     * BreadcrumbItem wraps one step in a breadcrumb trail.
     */
    BreadcrumbItem: {
        root: {
            class: "inline-flex items-center gap-1.5",
        },
    },
    /**
     * BreadcrumbLink styles navigable breadcrumb steps.
     */
    BreadcrumbLink: {
        root: {
            class: "hover:text-foreground transition-colors rounded-vueda-control focus-visible:focus-ring",
        },
    },
    /**
     * BreadcrumbPage marks the current page in a breadcrumb trail.
     */
    BreadcrumbPage: {
        root: {
            class: "text-foreground font-normal",
        },
    },
    /**
     * BreadcrumbSeparator renders the divider between breadcrumb steps.
     */
    BreadcrumbSeparator: {
        root: {
            class: "[&>svg]:size-3.5",
        },
    },
    /**
     * BreadcrumbEllipsis represents collapsed breadcrumb steps and can become interactive when needed.
     */
    BreadcrumbEllipsis: {
        root: ({ interactive }) => ({
            class: [
                "flex size-7 items-center justify-center",
                interactive &&
                    "cursor-pointer rounded-vueda-control transition-colors hover:bg-accent hover:text-foreground focus-visible:focus-ring",
            ],
        }),
        label: { class: "sr-only" },
    },

    // ---------- Dropdown Menu ----------
    /**
     * DropdownMenuGroup groups related dropdown menu items.
     */
    DropdownMenuGroup: { root: { class: "" } },
    /**
     * DropdownMenuRadioGroup groups mutually exclusive dropdown menu choices.
     */
    DropdownMenuRadioGroup: { root: { class: "" } },
    /**
     * DropdownMenuTrigger provides the activation target for a dropdown menu.
     */
    DropdownMenuTrigger: { root: { class: "" } },
    /**
     * DropdownMenuContent styles the floating dropdown menu surface.
     */
    DropdownMenuContent: {
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--reka-dropdown-menu-content-available-height) min-w-[8rem] origin-(--reka-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-vueda-control border p-1 shadow-vueda-popover",
        },
    },
    /**
     * DropdownMenuItem styles a selectable command inside a dropdown menu.
     */
    DropdownMenuItem: {
        root: {
            class: "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
    },
    /**
     * DropdownMenuCheckboxItem styles a toggleable dropdown menu choice with an indicator.
     */
    DropdownMenuCheckboxItem: {
        root: {
            class: "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        indicator: { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" },
    },
    /**
     * DropdownMenuRadioItem styles one option in a radio-style dropdown menu group.
     */
    DropdownMenuRadioItem: {
        root: {
            class: "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        indicator: { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" },
    },
    /**
     * DropdownMenuLabel styles a non-interactive label for a group of dropdown menu items.
     */
    DropdownMenuLabel: {
        root: {
            class: "text-muted-foreground px-2 py-1.5 font-mono text-[length:var(--vueda-text-micro)] font-semibold leading-none tracking-[0.04em] uppercase data-[inset]:pl-8",
        },
    },
    /**
     * DropdownMenuSeparator renders a divider between dropdown menu sections.
     */
    DropdownMenuSeparator: {
        root: {
            class: "bg-border -mx-1 my-1 h-px",
        },
    },
    /**
     * DropdownMenuShortcut styles keyboard shortcut hints aligned inside dropdown menu items.
     */
    DropdownMenuShortcut: {
        root: {
            class: "text-muted-foreground ml-auto font-mono text-[length:var(--vueda-text-micro)] font-medium leading-none",
        },
    },
    /**
     * DropdownMenuSubTrigger styles a dropdown menu item that opens a nested submenu.
     */
    DropdownMenuSubTrigger: {
        root: {
            class: "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground",
        },
        iconWrapper: { class: "ml-auto size-4" },
    },
    /**
     * DropdownMenuSubContent styles the floating surface for nested dropdown menu content.
     */
    DropdownMenuSubContent: {
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--reka-dropdown-menu-content-transform-origin) overflow-hidden rounded-vueda-control border p-1 shadow-vueda-popover",
        },
    },

    // ---------- Context Menu ----------
    /**
     * ContextMenuGroup groups related context menu items.
     */
    ContextMenuGroup: { root: { class: "" } },
    /**
     * ContextMenuRadioGroup groups mutually exclusive context menu choices.
     */
    ContextMenuRadioGroup: { root: { class: "" } },
    /**
     * ContextMenuTrigger provides the target that opens a context menu.
     */
    ContextMenuTrigger: { root: { class: "" } },
    /**
     * ContextMenuContent styles the floating context menu surface.
     */
    ContextMenuContent: {
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--reka-context-menu-content-available-height) min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-vueda-control border p-1 shadow-vueda-popover",
        },
    },
    /**
     * ContextMenuItem styles a selectable command inside a context menu.
     */
    ContextMenuItem: {
        root: {
            class: "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
    },
    /**
     * ContextMenuCheckboxItem styles a toggleable context menu choice with an indicator.
     */
    ContextMenuCheckboxItem: {
        root: {
            class: "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        indicator: { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" },
    },
    /**
     * ContextMenuRadioItem styles one option in a radio-style context menu group.
     */
    ContextMenuRadioItem: {
        root: {
            class: "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        indicator: { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" },
    },
    /**
     * ContextMenuLabel styles a non-interactive label for a group of context menu items.
     */
    ContextMenuLabel: {
        root: {
            class: "text-muted-foreground px-2 py-1.5 font-mono text-[length:var(--vueda-text-micro)] font-semibold leading-none tracking-[0.04em] uppercase data-[inset]:pl-8",
        },
    },
    /**
     * ContextMenuSeparator renders a divider between context menu sections.
     */
    ContextMenuSeparator: {
        root: {
            class: "bg-border -mx-1 my-1 h-px",
        },
    },
    /**
     * ContextMenuShortcut styles keyboard shortcut hints aligned inside context menu items.
     */
    ContextMenuShortcut: {
        root: {
            class: "text-muted-foreground ml-auto font-mono text-[length:var(--vueda-text-micro)] font-medium leading-none",
        },
    },
    /**
     * ContextMenuSubTrigger styles a context menu item that opens a nested submenu.
     */
    ContextMenuSubTrigger: {
        root: {
            class: "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        iconWrapper: { class: "ml-auto" },
    },
    /**
     * ContextMenuSubContent styles the floating surface for nested context menu content.
     */
    ContextMenuSubContent: {
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--reka-context-menu-content-transform-origin) overflow-hidden rounded-vueda-control border p-1 shadow-vueda-popover",
        },
    },

    // ---------- Menubar ----------
    /**
     * MenubarGroup groups related menubar items.
     */
    MenubarGroup: { root: { class: "" } },
    /**
     * MenubarRadioGroup groups mutually exclusive menubar choices.
     */
    MenubarRadioGroup: { root: { class: "" } },
    /**
     * Menubar styles the horizontal root container for application menus.
     */
    Menubar: {
        root: {
            class: "bg-background flex h-9 items-center gap-1 rounded-vueda-control border p-1 shadow-vueda-control",
        },
    },
    /**
     * MenubarTrigger styles a top-level menubar item that opens menu content.
     */
    MenubarTrigger: {
        root: {
            class: "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex items-center rounded-sm px-2 py-1 text-sm font-medium outline-hidden select-none",
        },
    },
    /**
     * MenubarContent styles the floating surface opened from a menubar trigger.
     */
    MenubarContent: {
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[12rem] origin-(--reka-menubar-content-transform-origin) overflow-hidden rounded-vueda-control border p-1 shadow-vueda-popover",
        },
    },
    /**
     * MenubarItem styles a selectable command inside menubar content.
     */
    MenubarItem: {
        root: {
            class: "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
    },
    /**
     * MenubarCheckboxItem styles a toggleable menubar choice with an indicator.
     */
    MenubarCheckboxItem: {
        root: {
            class: "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        indicator: { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" },
    },
    /**
     * MenubarRadioItem styles one option in a radio-style menubar group.
     */
    MenubarRadioItem: {
        root: {
            class: "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        indicator: { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" },
    },
    /**
     * MenubarLabel styles a non-interactive label for a group of menubar items.
     */
    MenubarLabel: {
        root: {
            class: "text-muted-foreground px-2 py-1.5 font-mono text-[length:var(--vueda-text-micro)] font-semibold leading-none tracking-[0.04em] uppercase data-[inset]:pl-8",
        },
    },
    /**
     * MenubarSeparator renders a divider between menubar sections.
     */
    MenubarSeparator: {
        root: {
            class: "bg-border -mx-1 my-1 h-px",
        },
    },
    /**
     * MenubarShortcut styles keyboard shortcut hints aligned inside menubar items.
     */
    MenubarShortcut: {
        root: {
            class: "text-muted-foreground ml-auto font-mono text-[length:var(--vueda-text-micro)] font-medium leading-none",
        },
    },
    /**
     * MenubarSubTrigger styles a menubar item that opens a nested submenu.
     */
    MenubarSubTrigger: {
        root: {
            class: "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[inset]:pl-8",
        },
        iconWrapper: { class: "ml-auto size-4" },
    },
    /**
     * MenubarSubContent styles the floating surface for nested menubar content.
     */
    MenubarSubContent: {
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--reka-menubar-content-transform-origin) overflow-hidden rounded-vueda-control border p-1 shadow-vueda-popover",
        },
    },

    // ---------- Navigation Menu ----------
    /**
     * NavigationMenu provides the root container for a multi-level navigation menu.
     */
    NavigationMenu: {
        root: {
            class: "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        },
    },
    /**
     * NavigationMenuList arranges top-level navigation menu items.
     */
    NavigationMenuList: {
        root: {
            class: "group flex flex-1 list-none items-center justify-center gap-1",
        },
    },
    /**
     * NavigationMenuItem wraps one top-level navigation menu entry.
     */
    NavigationMenuItem: {
        root: {
            class: "relative",
        },
    },
    /**
     * NavigationMenuTrigger styles an item that opens navigation menu content.
     */
    NavigationMenuTrigger: {
        root: {
            class: "group inline-flex h-9 w-max items-center justify-center rounded-vueda-control bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=open]:hover:bg-accent data-[state=open]:text-accent-foreground data-[state=open]:focus:bg-accent data-[state=open]:bg-accent/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        },
    },
    /**
     * NavigationMenuContent styles the panel that appears under an open navigation menu item.
     */
    NavigationMenuContent: {
        root: {
            class: [
                "data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 top-0 left-0 w-full p-2 pr-2.5 md:absolute md:w-auto",
                "group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-in group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-out group-data-[viewport=false]/navigation-menu:data-[state=closed]:zoom-out-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:zoom-in-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:fade-in-0 group-data-[viewport=false]/navigation-menu:data-[state=closed]:fade-out-0 group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-md group-data-[viewport=false]/navigation-menu:border group-data-[viewport=false]/navigation-menu:shadow group-data-[viewport=false]/navigation-menu:duration-200",
            ],
        },
    },
    /**
     * NavigationMenuLink styles links rendered inside navigation menu content.
     */
    NavigationMenuLink: {
        root: {
            class: "data-active:focus:bg-accent data-active:hover:bg-accent data-active:bg-accent/50 data-active:text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground flex flex-col gap-1 rounded-sm p-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg:not([class*='size-'])]:size-4",
        },
    },
    /**
     * NavigationMenuIndicator renders the pointer that connects a trigger to its open panel.
     */
    NavigationMenuIndicator: {
        root: {
            class: "data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden",
        },
        arrow: {
            class: "bg-popover border-l border-t border-border relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm",
        },
    },
    /**
     * NavigationMenuViewport styles the animated viewport that hosts navigation menu panels.
     */
    NavigationMenuViewport: {
        wrapper: {
            class: "absolute top-full left-0 isolate z-50 flex justify-center",
        },
        root: {
            class: "origin-top-center bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 relative mt-1.5 h-[var(--reka-navigation-menu-viewport-height)] w-full overflow-hidden rounded-vueda-control border shadow-vueda-popover md:w-[var(--reka-navigation-menu-viewport-width)] left-[var(--reka-navigation-menu-viewport-left)]",
        },
    },

    // ---------- Pagination ----------
    /**
     * PaginationItem styles a numbered pagination control and its active state.
     */
    PaginationItem: {
        root: ({ isActive }) => ({
            composes: ["_ButtonBase.root", isActive ? "_ButtonOutline.root" : "_ButtonGhost.root"],
            class: [],
        }),
    },
    /**
     * NavigationPaginationNavButton styles pagination controls that move to previous, next, first, or last pages.
     */
    NavigationPaginationNavButton: {
        root: {
            composes: ["_ButtonBase.root", "_ButtonGhost.root"],
            class: ["gap-1 px-2.5 sm:pr-2.5"],
        },
    },
    /**
     * PaginationContent arranges pagination controls in a compact row.
     */
    PaginationContent: {
        root: {
            class: "flex flex-row items-center gap-1",
        },
    },
    /**
     * PaginationEllipsis represents omitted pages in a pagination control.
     */
    PaginationEllipsis: {
        root: {
            class: "flex size-9 items-center justify-center",
        },
    },
    /**
     * Pagination provides the root layout for pagination controls.
     */
    Pagination: {
        root: {
            class: "mx-auto flex w-full justify-center",
        },
    },
    /**
     * NavigationPaginationBar styles a pagination bar anchored below a navigation surface.
     */
    NavigationPaginationBar: {
        root: {
            class: "flex w-full items-center justify-between gap-3 rounded-b-vueda-card border-t border-border bg-card px-3 py-2",
        },
    },
    /**
     * PaginationMeta styles the compact record or page-count text shown with pagination.
     */
    PaginationMeta: {
        root: {
            class: "font-mono text-[length:var(--vueda-text-supporting)] leading-none text-muted-foreground whitespace-nowrap",
        },
    },
    /**
     * PaginationComponent styles the composed pagination widget used by higher-level data views.
     */
    PaginationComponent: {
        root: {
            class: "flex flex-col sm:flex-row justify-between sm:justify-between items-center gap-2",
        },
        paginator: {
            class: ["py-2 flex-1 flex justify-center"],
        },
        pageReport: {
            class: ["text-sm tabular-nums"],
        },
        totalRecords: {
            class: ["p-2"],
        },
    },

    // ---------- Sidebar ----------
    /**
     * SidebarContent provides the scrollable main content region inside a sidebar.
     */
    SidebarContent: {
        root: {
            class: "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        },
    },
    /**
     * SidebarFooter styles footer content placed at the bottom of a sidebar.
     */
    SidebarFooter: {
        root: {
            class: "flex flex-col gap-2 p-2",
        },
    },
    /**
     * SidebarUserBlock lays out user identity details inside the sidebar footer.
     */
    SidebarUserBlock: {
        root: {
            class: "flex w-full items-center gap-2",
        },
        text: {
            class: "flex min-w-0 flex-1 flex-col",
        },
        // Name: 13 px / 500 / sidebar-foreground. Tight leading inside the dense
        // footer row; truncation guards against long display names overflowing the rail.
        name: {
            class: "truncate text-[length:var(--vueda-text-body)] font-medium leading-tight text-sidebar-foreground",
        },
        // Role: 11 px / 400 / muted-foreground. Same micro size as SidebarGroupLabel.
        role: {
            class: "truncate text-[length:var(--vueda-text-micro)] font-normal leading-tight text-muted-foreground",
        },
    },
    /**
     * SidebarGroupContent wraps the body of a sidebar group.
     */
    SidebarGroupContent: {
        root: {
            class: "w-full text-sm",
        },
    },
    /**
     * SidebarGroup provides a section container for related sidebar controls.
     */
    SidebarGroup: {
        root: {
            class: "relative flex w-full min-w-0 flex-col p-2",
        },
    },
    /**
     * SidebarHeader styles header content placed at the top of a sidebar.
     */
    SidebarHeader: {
        root: {
            class: "flex flex-col gap-2 p-2",
        },
    },
    /**
     * SidebarInput styles search or filter fields embedded in a sidebar.
     */
    SidebarInput: {
        root: {
            class: "bg-background h-8 w-full shadow-none [--vueda-hairline-color:var(--sidebar-border)]! focus-visible:[--vueda-hairline-color:var(--sidebar-ring)]!",
        },
    },
    /**
     * SidebarMenuItem wraps one item in a sidebar menu.
     */
    SidebarMenuItem: {
        root: {
            class: "group/menu-item relative",
        },
    },
    /**
     * SidebarMenuSub styles nested menu lists inside a sidebar menu item.
     */
    SidebarMenuSub: {
        root: {
            class: [
                "border-sidebar-border mx-3 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5",
                "group-data-[collapsible=icon]:hidden",
            ],
        },
    },
    /**
     * SidebarMenuSubItem wraps one nested sidebar menu item.
     */
    SidebarMenuSubItem: {
        root: {
            class: "group/menu-sub-item relative",
        },
    },
    /**
     * SidebarMenu arranges sidebar menu items in a vertical list.
     */
    SidebarMenu: {
        root: {
            class: "flex w-full min-w-0 flex-col gap-1",
        },
    },
    /**
     * SidebarGroupAction styles a compact action button aligned with a sidebar group header.
     */
    SidebarGroupAction: {
        root: {
            class: [
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-vueda-control p-0 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring [&>svg]:size-4 [&>svg]:shrink-0",
                "after:absolute after:-inset-2 md:after:hidden",
                "group-data-[collapsible=icon]:hidden",
            ],
        },
    },
    /**
     * SidebarGroupLabel styles the heading text for a sidebar group.
     */
    SidebarGroupLabel: {
        root: {
            class: [
                "text-muted-foreground flex h-6 shrink-0 items-center px-2 text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.08em] transition-[margin,opacity] duration-200 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring [&>svg]:size-4 [&>svg]:shrink-0",
                "group-data-[collapsible=icon]:-mt-6 group-data-[collapsible=icon]:opacity-0",
            ],
        },
    },
    /**
     * SidebarInset styles the main content wrapper that sits beside or within a sidebar layout.
     */
    SidebarInset: {
        root: {
            class: [
                "bg-background relative flex w-full flex-1 flex-col",
                "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-vueda-card md:peer-data-[variant=inset]:shadow-vueda-card md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
            ],
        },
    },
    /**
     * SidebarMenuBadge styles small count or status badges aligned to sidebar menu buttons.
     */
    SidebarMenuBadge: {
        root: ({ tone }) => ({
            class: [
                "pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-vueda-control px-1 font-mono text-[length:var(--vueda-text-micro)] font-semibold tabular-nums select-none",
                "peer-data-[size=sm]/menu-button:top-1",
                "peer-data-[size=default]/menu-button:top-1.5",
                "peer-data-[size=lg]/menu-button:top-2.5",
                {
                    "bg-sidebar-accent text-sidebar-foreground peer-data-[active=true]/menu-button:bg-[color-mix(in_oklab,var(--sidebar-primary)_14%,transparent)] peer-data-[active=true]/menu-button:text-sidebar-primary":
                        !tone || tone === "neutral",
                    "bg-[color-mix(in_oklab,var(--sidebar-primary)_14%,transparent)] text-sidebar-primary":
                        tone === "primary",
                    "bg-[color-mix(in_oklab,var(--destructive)_14%,transparent)] text-destructive":
                        tone === "destructive",
                },
                "group-data-[collapsible=icon]:hidden",
            ],
        }),
    },
    /**
     * SidebarRail styles the drag or click target along the edge of a collapsible sidebar.
     */
    SidebarRail: {
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
    /**
     * SidebarSeparator renders a divider between sidebar sections.
     */
    SidebarSeparator: {
        root: {
            class: "bg-sidebar-border my-1",
        },
    },
    /**
     * SidebarTrigger styles the compact control that toggles the sidebar.
     */
    SidebarTrigger: {
        root: {
            class: "h-7 w-7",
        },
    },
    /**
     * SidebarMenuAction styles a trailing action button attached to a sidebar menu item.
     */
    SidebarMenuAction: {
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
    /**
     * SidebarMenuSubButton styles interactive controls inside nested sidebar menu lists.
     */
    SidebarMenuSubButton: {
        root: ({ size }) => ({
            class: [
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground relative flex min-w-0 -translate-x-px items-center gap-2 rounded-vueda-control px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
                "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
                "data-[active=true]:before:absolute data-[active=true]:before:inset-y-0 data-[active=true]:before:left-[-11px] data-[active=true]:before:w-(--vueda-sidebar-active-rail) data-[active=true]:before:bg-sidebar-primary data-[active=true]:before:content-['']",
                { "h-6 text-xs": size === "sm", "h-7 text-sm": size === "md" },
                "group-data-[collapsible=icon]:hidden",
            ],
        }),
    },
    /**
     * SidebarMenuSkeleton styles placeholder rows while sidebar menu content loads.
     */
    SidebarMenuSkeleton: {
        root: {
            class: "flex h-8 items-center gap-2 rounded-md px-2",
        },
    },
    /**
     * SidebarProvider styles the layout wrapper that provides sidebar state to descendants.
     */
    SidebarProvider: {
        root: {
            class: "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
        },
    },
    /**
     * Sidebar styles the primary collapsible navigation region and its responsive panel structure.
     */
    Sidebar: {
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
    /**
     * SidebarMenuButtonChild styles the interactive button content used by sidebar menu items.
     */
    SidebarMenuButtonChild: {
        root: ({ variant, size }) => ({
            class: [
                "peer/menu-button relative flex w-full items-center gap-2 rounded-vueda-control p-2 text-left text-sm transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
                "data-[active=true]:before:absolute data-[active=true]:before:inset-y-0 data-[active=true]:before:left-0 data-[active=true]:before:w-(--vueda-sidebar-active-rail) data-[active=true]:before:bg-sidebar-primary data-[active=true]:before:content-['']",
                "group-data-[collapsible=icon]:data-[active=true]:before:-left-2",
                "data-[active=true]:[&>svg]:text-sidebar-primary",
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
