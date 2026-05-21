/**
 * @module theme/vueda-tailwind/navigation
 * @description Tailwind CSS theme configuration for VUEDA Client navigation primitives.
 */

export default {
    // ---------- Breadcrumb ----------
    /**
     * Breadcrumb provides the root context for a trail of hierarchical navigation links.
     */
    Breadcrumb: {
        /** Root context only. The trail's visible layout lives on {@api theme-key:BreadcrumbList.root}. */
        root: { class: "" },
    },
    /**
     * BreadcrumbList arranges breadcrumb items and separators in a wrapping inline row.
     */
    BreadcrumbList: {
        /** Inline wrapping row for breadcrumb items. */
        root: {
            class: "text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
        },
    },
    /**
     * BreadcrumbItem wraps one step in a breadcrumb trail.
     */
    BreadcrumbItem: {
        /** One breadcrumb step plus its separator affordance, sized as an inline cluster. */
        root: {
            class: "inline-flex items-center gap-1.5",
        },
    },
    /**
     * BreadcrumbLink styles navigable breadcrumb steps.
     */
    BreadcrumbLink: {
        /** Navigable trail step. Hover and focus move toward foreground without changing weight. */
        root: {
            class: "hover:text-foreground transition-colors rounded-vueda-control focus-visible:focus-ring",
        },
    },
    /**
     * BreadcrumbPage marks the current page in a breadcrumb trail.
     */
    BreadcrumbPage: {
        /** Current-page trail step. Uses foreground colour, not heavier type, so the trail still reads as one line. */
        root: {
            class: "text-foreground font-normal",
        },
    },
    /**
     * BreadcrumbSeparator renders the divider between breadcrumb steps.
     */
    BreadcrumbSeparator: {
        /** Separator glyph sizing. Default markup supplies a slash, while custom children can supply another glyph. */
        root: {
            class: "[&>svg]:size-3.5",
        },
    },
    /**
     * BreadcrumbEllipsis represents collapsed breadcrumb steps and can become interactive when needed.
     */
    BreadcrumbEllipsis: {
        /** Collapsed-step marker. The `interactive` state turns it into the dropdown trigger shape. */
        root: ({ interactive }) => ({
            class: [
                "flex size-7 items-center justify-center",
                interactive &&
                    "cursor-pointer rounded-vueda-control transition-colors hover:bg-accent hover:text-foreground focus-visible:focus-ring",
            ],
        }),
        /** Screen-reader text for the collapsed-step marker. */
        label: { class: "sr-only" },
    },

    // ---------- Dropdown Menu ----------
    /**
     * DropdownMenuGroup groups related dropdown menu items.
     */
    DropdownMenuGroup: {
        /** Semantic grouping only. Item spacing and dividers are owned by child item and separator slots. */
        root: { class: "" },
    },
    /**
     * DropdownMenuRadioGroup groups mutually exclusive dropdown menu choices.
     */
    DropdownMenuRadioGroup: {
        /** Semantic radio group only. Individual options own their indicator offset. */
        root: { class: "" },
    },
    /**
     * DropdownMenuTrigger provides the activation target for a dropdown menu.
     */
    DropdownMenuTrigger: {
        /** Unstyled trigger pass-through so callers can compose Button or custom trigger chrome. */
        root: { class: "" },
    },
    /**
     * DropdownMenuContent styles the floating dropdown menu surface.
     */
    DropdownMenuContent: {
        /** Popover-like menu surface with bounded height, menu padding, and side-aware entrance motion. */
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--reka-dropdown-menu-content-available-height) min-w-[8rem] origin-(--reka-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-vueda-control border p-1 shadow-vueda-popover",
        },
    },
    /**
     * DropdownMenuItem styles a selectable command inside a dropdown menu.
     */
    DropdownMenuItem: {
        /** Selectable menu row. Focus uses neutral accent, destructive rows tint text and focus fill without changing the surface recipe. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
    },
    /**
     * DropdownMenuCheckboxItem styles a toggleable dropdown menu choice with an indicator.
     */
    DropdownMenuCheckboxItem: {
        /** Toggleable menu row with reserved indicator space at the leading edge. See also: {@api theme-key:DropdownMenuItem.root}. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        /** Absolute indicator box aligned inside the leading gutter reserved by {@api theme-key:DropdownMenuCheckboxItem.root}. */
        indicator: { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" },
    },
    /**
     * DropdownMenuRadioItem styles one option in a radio-style dropdown menu group.
     */
    DropdownMenuRadioItem: {
        /** Mutually exclusive menu row. Same layout as {@api theme-key:DropdownMenuCheckboxItem.root}; selection state comes from the radio primitive. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        /** Radio selection indicator aligned to the shared leading gutter. */
        indicator: { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" },
    },
    /**
     * DropdownMenuLabel styles a non-interactive label for a group of dropdown menu items.
     */
    DropdownMenuLabel: {
        /** Non-interactive group label using the mono micro uppercase recipe. */
        root: {
            class: "text-muted-foreground px-2 py-1.5 font-mono text-[length:var(--vueda-text-micro)] font-semibold leading-none tracking-[0.04em] uppercase data-[inset]:pl-8",
        },
    },
    /**
     * DropdownMenuSeparator renders a divider between dropdown menu sections.
     */
    DropdownMenuSeparator: {
        /** Full-width menu divider that bleeds through the content padding. */
        root: {
            class: "bg-border -mx-1 my-1 h-px",
        },
    },
    /**
     * DropdownMenuShortcut styles keyboard shortcut hints aligned inside dropdown menu items.
     */
    DropdownMenuShortcut: {
        /** Trailing keyboard hint with mono micro type so shortcuts scan independently from item labels. */
        root: {
            class: "text-muted-foreground ml-auto font-mono text-[length:var(--vueda-text-micro)] font-medium leading-none",
        },
    },
    /**
     * DropdownMenuSubTrigger styles a dropdown menu item that opens a nested submenu.
     */
    DropdownMenuSubTrigger: {
        /** Menu row that opens a child surface. Open and focused states share the same neutral accent fill. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground",
        },
        /** Trailing chevron wrapper that reserves submenu affordance space at the row edge. */
        iconWrapper: { class: "ml-auto size-4" },
    },
    /**
     * DropdownMenuSubContent styles the floating surface for nested dropdown menu content.
     */
    DropdownMenuSubContent: {
        /** Child popover surface for nested menu content. Mirrors {@api theme-key:DropdownMenuContent.root} without the scroll height cap. */
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--reka-dropdown-menu-content-transform-origin) overflow-hidden rounded-vueda-control border p-1 shadow-vueda-popover",
        },
    },

    // ---------- Context Menu ----------
    /**
     * ContextMenuGroup groups related context menu items.
     */
    ContextMenuGroup: {
        /** Semantic grouping only. See also: {@api theme-key:DropdownMenuGroup.root}. */
        root: { class: "" },
    },
    /**
     * ContextMenuRadioGroup groups mutually exclusive context menu choices.
     */
    ContextMenuRadioGroup: {
        /** Semantic radio group only. See also: {@api theme-key:DropdownMenuRadioGroup.root}. */
        root: { class: "" },
    },
    /**
     * ContextMenuTrigger provides the target that opens a context menu.
     */
    ContextMenuTrigger: {
        /** Unstyled trigger pass-through for the element that owns the context-menu gesture. */
        root: { class: "" },
    },
    /**
     * ContextMenuContent styles the floating context menu surface.
     */
    ContextMenuContent: {
        /** Context-menu surface. Matches {@api theme-key:DropdownMenuContent.root} while using context-menu collision sizing. */
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--reka-context-menu-content-available-height) min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-vueda-control border p-1 shadow-vueda-popover",
        },
    },
    /**
     * ContextMenuItem styles a selectable command inside a context menu.
     */
    ContextMenuItem: {
        /** Selectable context-menu row. See also: {@api theme-key:DropdownMenuItem.root}. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
    },
    /**
     * ContextMenuCheckboxItem styles a toggleable context menu choice with an indicator.
     */
    ContextMenuCheckboxItem: {
        /** Toggleable context-menu row with reserved indicator space. See also: {@api theme-key:DropdownMenuCheckboxItem.root}. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        /** Checkbox indicator aligned to the context-menu leading gutter. */
        indicator: { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" },
    },
    /**
     * ContextMenuRadioItem styles one option in a radio-style context menu group.
     */
    ContextMenuRadioItem: {
        /** Radio-style context-menu row. See also: {@api theme-key:DropdownMenuRadioItem.root}. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        /** Radio indicator aligned to the context-menu leading gutter. */
        indicator: { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" },
    },
    /**
     * ContextMenuLabel styles a non-interactive label for a group of context menu items.
     */
    ContextMenuLabel: {
        /** Non-interactive context-menu group label. See also: {@api theme-key:DropdownMenuLabel.root}. */
        root: {
            class: "text-muted-foreground px-2 py-1.5 font-mono text-[length:var(--vueda-text-micro)] font-semibold leading-none tracking-[0.04em] uppercase data-[inset]:pl-8",
        },
    },
    /**
     * ContextMenuSeparator renders a divider between context menu sections.
     */
    ContextMenuSeparator: {
        /** Context-menu divider that bleeds through menu padding. See also: {@api theme-key:DropdownMenuSeparator.root}. */
        root: {
            class: "bg-border -mx-1 my-1 h-px",
        },
    },
    /**
     * ContextMenuShortcut styles keyboard shortcut hints aligned inside context menu items.
     */
    ContextMenuShortcut: {
        /** Trailing keyboard hint for context-menu commands. See also: {@api theme-key:DropdownMenuShortcut.root}. */
        root: {
            class: "text-muted-foreground ml-auto font-mono text-[length:var(--vueda-text-micro)] font-medium leading-none",
        },
    },
    /**
     * ContextMenuSubTrigger styles a context menu item that opens a nested submenu.
     */
    ContextMenuSubTrigger: {
        /** Context-menu row that opens a child surface. See also: {@api theme-key:DropdownMenuSubTrigger.root}. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        /** Trailing chevron wrapper for submenu affordance space. */
        iconWrapper: { class: "ml-auto" },
    },
    /**
     * ContextMenuSubContent styles the floating surface for nested context menu content.
     */
    ContextMenuSubContent: {
        /** Child context-menu surface. See also: {@api theme-key:DropdownMenuSubContent.root}. */
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--reka-context-menu-content-transform-origin) overflow-hidden rounded-vueda-control border p-1 shadow-vueda-popover",
        },
    },

    // ---------- Menubar ----------
    /**
     * MenubarGroup groups related menubar items.
     */
    MenubarGroup: {
        /** Semantic grouping only inside menubar content. See also: {@api theme-key:DropdownMenuGroup.root}. */
        root: { class: "" },
    },
    /**
     * MenubarRadioGroup groups mutually exclusive menubar choices.
     */
    MenubarRadioGroup: {
        /** Semantic radio group only inside menubar content. See also: {@api theme-key:DropdownMenuRadioGroup.root}. */
        root: { class: "" },
    },
    /**
     * Menubar styles the horizontal root container for application menus.
     */
    Menubar: {
        /** Horizontal menu bar surface. It keeps the popover/menu family language while the bar shadow stays flat. */
        root: {
            class: "bg-background flex h-9 items-center gap-1 rounded-vueda-control border p-1 shadow-vueda-control",
        },
    },
    /**
     * MenubarTrigger styles a top-level menubar item that opens menu content.
     */
    MenubarTrigger: {
        /** Top-level menubar trigger. Uses compact rounded corners and neutral accent open/focus states. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex items-center rounded-sm px-2 py-1 text-sm font-medium outline-hidden select-none",
        },
    },
    /**
     * MenubarContent styles the floating surface opened from a menubar trigger.
     */
    MenubarContent: {
        /** Floating menu surface opened from the menubar. See also: {@api theme-key:DropdownMenuContent.root}. */
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[12rem] origin-(--reka-menubar-content-transform-origin) overflow-hidden rounded-vueda-control border p-1 shadow-vueda-popover",
        },
    },
    /**
     * MenubarItem styles a selectable command inside menubar content.
     */
    MenubarItem: {
        /** Selectable menubar command row. See also: {@api theme-key:DropdownMenuItem.root}. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
    },
    /**
     * MenubarCheckboxItem styles a toggleable menubar choice with an indicator.
     */
    MenubarCheckboxItem: {
        /** Toggleable menubar row with reserved indicator space. Differs from dropdown by using the tighter menubar row radius. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        /** Checkbox indicator aligned to the menubar row's leading gutter. */
        indicator: { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" },
    },
    /**
     * MenubarRadioItem styles one option in a radio-style menubar group.
     */
    MenubarRadioItem: {
        /** Radio-style menubar row. Same row geometry as {@api theme-key:MenubarCheckboxItem.root}. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        /** Radio indicator aligned to the menubar row's leading gutter. */
        indicator: { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" },
    },
    /**
     * MenubarLabel styles a non-interactive label for a group of menubar items.
     */
    MenubarLabel: {
        /** Non-interactive menubar group label. See also: {@api theme-key:DropdownMenuLabel.root}. */
        root: {
            class: "text-muted-foreground px-2 py-1.5 font-mono text-[length:var(--vueda-text-micro)] font-semibold leading-none tracking-[0.04em] uppercase data-[inset]:pl-8",
        },
    },
    /**
     * MenubarSeparator renders a divider between menubar sections.
     */
    MenubarSeparator: {
        /** Menubar content divider that bleeds through menu padding. See also: {@api theme-key:DropdownMenuSeparator.root}. */
        root: {
            class: "bg-border -mx-1 my-1 h-px",
        },
    },
    /**
     * MenubarShortcut styles keyboard shortcut hints aligned inside menubar items.
     */
    MenubarShortcut: {
        /** Trailing keyboard hint inside menubar content. See also: {@api theme-key:DropdownMenuShortcut.root}. */
        root: {
            class: "text-muted-foreground ml-auto font-mono text-[length:var(--vueda-text-micro)] font-medium leading-none",
        },
    },
    /**
     * MenubarSubTrigger styles a menubar item that opens a nested submenu.
     */
    MenubarSubTrigger: {
        /** Menubar row that opens a nested submenu. See also: {@api theme-key:DropdownMenuSubTrigger.root}. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[inset]:pl-8",
        },
        /** Trailing chevron wrapper for submenu affordance space. */
        iconWrapper: { class: "ml-auto size-4" },
    },
    /**
     * MenubarSubContent styles the floating surface for nested menubar content.
     */
    MenubarSubContent: {
        /** Child menubar surface. See also: {@api theme-key:DropdownMenuSubContent.root}. */
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--reka-menubar-content-transform-origin) overflow-hidden rounded-vueda-control border p-1 shadow-vueda-popover",
        },
    },

    // ---------- Navigation Menu ----------
    /**
     * NavigationMenu provides the root container for a multi-level navigation menu.
     */
    NavigationMenu: {
        /** Root flex context that centers the navigation menu and scopes viewport mode selectors. */
        root: {
            class: "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        },
    },
    /**
     * NavigationMenuList arranges top-level navigation menu items.
     */
    NavigationMenuList: {
        /** Top-level list row for navigation menu items, with reset list styling and compact gaps. */
        root: {
            class: "group flex flex-1 list-none items-center justify-center gap-1",
        },
    },
    /**
     * NavigationMenuItem wraps one top-level navigation menu entry.
     */
    NavigationMenuItem: {
        /** Positioning wrapper for one top-level navigation menu entry and its content. */
        root: {
            class: "relative",
        },
    },
    /**
     * NavigationMenuTrigger styles an item that opens navigation menu content.
     */
    NavigationMenuTrigger: {
        /** Header-scale trigger. It intentionally uses a 36px height and half-strength active fill. */
        root: {
            class: "group inline-flex h-9 w-max items-center justify-center rounded-vueda-control bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=open]:hover:bg-accent data-[state=open]:text-accent-foreground data-[state=open]:focus:bg-accent data-[state=open]:bg-accent/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        },
    },
    /**
     * NavigationMenuContent styles the panel that appears under an open navigation menu item.
     */
    NavigationMenuContent: {
        /** Panel content area with motion-aware slide transitions. When the viewport is disabled, this slot becomes its own popover surface. */
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
        /** Link row inside a navigation panel. Active uses `bg-accent/50` so hover remains the stronger cue. */
        root: {
            class: "data-active:focus:bg-accent data-active:hover:bg-accent data-active:bg-accent/50 data-active:text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground flex flex-col gap-1 rounded-sm p-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg:not([class*='size-'])]:size-4",
        },
    },
    /**
     * NavigationMenuIndicator renders the pointer that connects a trigger to its open panel.
     */
    NavigationMenuIndicator: {
        /** Animated indicator container that lines up the arrow between the trigger and open panel. */
        root: {
            class: "data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden",
        },
        /** Rotated popover-colored arrow for navigation-menu content. */
        arrow: {
            class: "bg-popover border-l border-t border-border relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm",
        },
    },
    /**
     * NavigationMenuViewport styles the animated viewport that hosts navigation menu panels.
     */
    NavigationMenuViewport: {
        /** Absolute wrapper that positions the shared viewport below the trigger row. */
        wrapper: {
            class: "absolute top-full left-0 isolate z-50 flex justify-center",
        },
        /** Shared animated popover surface for navigation panels. See also: {@api theme-key:NavigationMenuContent.root}. */
        root: {
            class: "origin-top-center bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 relative mt-1.5 h-[var(--reka-navigation-menu-viewport-height)] w-full overflow-hidden rounded-vueda-control border shadow-vueda-popover md:w-[var(--reka-navigation-menu-viewport-width)] left-[var(--reka-navigation-menu-viewport-left)]",
        },
    },

    // ---------- Pagination ----------
    /**
     * PaginationItem styles a numbered pagination control and its active state.
     */
    PaginationItem: {
        /** Numbered page control. Composes the Button base and switches between outline active and ghost inactive variants. */
        root: ({ isActive }) => ({
            composes: ["_ButtonBase.root", isActive ? "_ButtonOutline.root" : "_ButtonGhost.root"],
            class: [],
        }),
    },
    /**
     * NavigationPaginationNavButton styles pagination controls that move to previous, next, first, or last pages.
     */
    NavigationPaginationNavButton: {
        /** Previous, next, first, or last control. It stays ghost but adds room for a label. */
        root: {
            composes: ["_ButtonBase.root", "_ButtonGhost.root"],
            class: ["gap-1 px-2.5 sm:pr-2.5"],
        },
    },
    /**
     * PaginationContent arranges pagination controls in a compact row.
     */
    PaginationContent: {
        /** Compact row that groups page controls without owning their button chrome. */
        root: {
            class: "flex flex-row items-center gap-1",
        },
    },
    /**
     * PaginationEllipsis represents omitted pages in a pagination control.
     */
    PaginationEllipsis: {
        /** Omitted-page marker sized to align with neighboring pagination controls. */
        root: {
            class: "flex size-9 items-center justify-center",
        },
    },
    /**
     * Pagination provides the root layout for pagination controls.
     */
    Pagination: {
        /** Root pagination nav layout, centered across the available width. */
        root: {
            class: "mx-auto flex w-full justify-center",
        },
    },
    /**
     * NavigationPaginationBar styles a pagination bar anchored below a navigation surface.
     */
    NavigationPaginationBar: {
        /** Footer bar for table and objects-grid pagination, seated against the bottom of card-like data surfaces. */
        root: {
            class: "flex w-full items-center justify-between gap-3 rounded-b-vueda-card border-t border-border bg-card px-3 py-2",
        },
    },
    /**
     * PaginationMeta styles the compact record or page-count text shown with pagination.
     */
    PaginationMeta: {
        /** Compact mono count text for page or record summaries. See also: {@api theme-key:NavigationPaginationBar.root}. */
        root: {
            class: "font-mono text-[length:var(--vueda-text-supporting)] leading-none text-muted-foreground whitespace-nowrap",
        },
    },
    /**
     * PaginationComponent styles the composed pagination widget used by higher-level data views.
     */
    PaginationComponent: {
        /** Responsive wrapper for the composed pagination widget used by higher-level views. */
        root: {
            class: "flex flex-col sm:flex-row justify-between sm:justify-between items-center gap-2",
        },
        /** Centered pagination control region within the composed widget. */
        paginator: {
            class: ["py-2 flex-1 flex justify-center"],
        },
        /** Tabular page-report text for stable numeric alignment. */
        pageReport: {
            class: ["text-sm tabular-nums"],
        },
        /** Padding wrapper for total-records copy when the composed widget renders it separately. */
        totalRecords: {
            class: ["p-2"],
        },
    },

    // ---------- Sidebar ----------
    /**
     * SidebarContent provides the scrollable main content region inside a sidebar.
     */
    SidebarContent: {
        /** Scrollable main sidebar region. Icon-collapsed mode hides overflow so labels do not bleed past the rail. */
        root: {
            class: "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        },
    },
    /**
     * SidebarFooter styles footer content placed at the bottom of a sidebar.
     */
    SidebarFooter: {
        /** Bottom sidebar section for account and secondary controls, using the same padding cadence as the header. */
        root: {
            class: "flex flex-col gap-2 p-2",
        },
    },
    /**
     * SidebarUserBlock lays out user identity details inside the sidebar footer.
     */
    SidebarUserBlock: {
        /** Horizontal account row for the sidebar footer. */
        root: {
            class: "flex w-full items-center gap-2",
        },
        /** Min-width guard for truncating name and role text beside the avatar and action button. */
        text: {
            class: "flex min-w-0 flex-1 flex-col",
        },
        /** Display-name text. Tight leading and truncation keep long names inside the dense footer row. */
        name: {
            class: "truncate text-[length:var(--vueda-text-body)] font-medium leading-tight text-sidebar-foreground",
        },
        /** Secondary role text using the same micro scale as {@api theme-key:SidebarGroupLabel.root}. */
        role: {
            class: "truncate text-[length:var(--vueda-text-micro)] font-normal leading-tight text-muted-foreground",
        },
    },
    /**
     * SidebarGroupContent wraps the body of a sidebar group.
     */
    SidebarGroupContent: {
        /** Full-width body area for controls inside a sidebar group. */
        root: {
            class: "w-full text-sm",
        },
    },
    /**
     * SidebarGroup provides a section container for related sidebar controls.
     */
    SidebarGroup: {
        /** Section wrapper that provides local padding and positioning for group labels and actions. */
        root: {
            class: "relative flex w-full min-w-0 flex-col p-2",
        },
    },
    /**
     * SidebarHeader styles header content placed at the top of a sidebar.
     */
    SidebarHeader: {
        /** Top sidebar section for brand, search, or primary navigation controls. */
        root: {
            class: "flex flex-col gap-2 p-2",
        },
    },
    /**
     * SidebarInput styles search or filter fields embedded in a sidebar.
     */
    SidebarInput: {
        /** Sidebar-local input chrome. It binds hairline and focus colors to sidebar tokens rather than generic input tokens. */
        root: {
            class: "bg-background h-8 w-full shadow-none [--vueda-hairline-color:var(--sidebar-border)]! focus-visible:[--vueda-hairline-color:var(--sidebar-ring)]!",
        },
    },
    /**
     * SidebarMenuItem wraps one item in a sidebar menu.
     */
    SidebarMenuItem: {
        /** Relative wrapper that scopes peer selectors for buttons, badges, and trailing actions. */
        root: {
            class: "group/menu-item relative",
        },
    },
    /**
     * SidebarMenuSub styles nested menu lists inside a sidebar menu item.
     */
    SidebarMenuSub: {
        /** Nested list rail and indentation for submenu items. Icon-collapsed mode hides the nested list. */
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
        /** Relative wrapper for one nested sidebar menu item. */
        root: {
            class: "group/menu-sub-item relative",
        },
    },
    /**
     * SidebarMenu arranges sidebar menu items in a vertical list.
     */
    SidebarMenu: {
        /** Vertical menu list with narrow gaps for dense sidebar navigation. */
        root: {
            class: "flex w-full min-w-0 flex-col gap-1",
        },
    },
    /**
     * SidebarGroupAction styles a compact action button aligned with a sidebar group header.
     */
    SidebarGroupAction: {
        /** Compact header action aligned to a group label. Hidden in icon-collapsed mode. */
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
        /** Sidebar group heading using the page-level eyebrow recipe. */
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
        /** Main content wrapper adjacent to the sidebar. Inset variant chrome exists in source but is not the admin-app default. */
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
        /** Count or status badge anchored to a menu button. Tone handling stays local to sidebar tokens and hides in icon-collapsed mode. */
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
        /** Edge hit target for resizing or toggling collapsed state, with cursors flipped by side and state. */
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
        /** Full-bleed sidebar divider. It avoids inset hairlines so section breaks do not read as notches. */
        root: {
            class: "bg-sidebar-border my-1",
        },
    },
    /**
     * SidebarTrigger styles the compact control that toggles the sidebar.
     */
    SidebarTrigger: {
        /** Compact sidebar toggle button. The glyph is supplied through the icon registry. */
        root: {
            class: "h-7 w-7",
        },
    },
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
    /**
     * SidebarMenuSubButton styles interactive controls inside nested sidebar menu lists.
     */
    SidebarMenuSubButton: {
        /** Nested sidebar control. Active state paints the sidebar rail through {@api css-token:vueda-sidebar-active-rail}. */
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
        /** Placeholder menu row that aligns loading content with normal sidebar menu button geometry. */
        root: {
            class: "flex h-8 items-center gap-2 rounded-md px-2",
        },
    },
    /**
     * SidebarProvider styles the layout wrapper that provides sidebar state to descendants.
     */
    SidebarProvider: {
        /** Layout wrapper that scopes sidebar state selectors and inset variant background behavior. */
        root: {
            class: "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
        },
    },
    /**
     * Sidebar styles the primary collapsible navigation region and its responsive panel structure.
     */
    Sidebar: {
        /** Uncollapsed sidebar body for the `none` collapsible mode. */
        rootNone: {
            class: "bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col",
        },
        /** Layout spacer that preserves desktop content offset while the fixed panel transitions. */
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
        /** Fixed desktop panel. Width and offcanvas transitions are driven by SidebarProvider CSS variables. */
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
        /** Primary sidebar menu button content. Active state uses a rail and icon tint, not a type-weight bump, so hover does not shift label width. */
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
