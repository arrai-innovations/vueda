/**
 * @module theme/vueda-tailwind/shell
 * @description Tailwind CSS theme configuration for VUEDA Client shell primitives.
 */

export default {
    // accordion
    Accordion: {
        root: { class: "" },
    },
    AccordionItem: {
        root: {
            class: "border-b last:border-b-0",
        },
    },
    AccordionContent: {
        root: {
            class: "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm",
        },
        inner: {
            class: "pt-0 pb-4",
        },
    },
    AccordionTrigger: {
        root: {
            class: "flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
        },
        header: {
            class: "flex",
        },
        icon: {
            class: "text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200",
        },
    },

    // alert-dialog
    AlertDialogAction: {
        root: {
            composes: ["_ButtonBase.root", "_ButtonDefault.root"],
            class: [],
        },
    },
    AlertDialogCancel: {
        root: {
            composes: ["_ButtonBase.root", "_ButtonOutline.root"],
            class: ["mt-2 sm:mt-0"],
        },
    },
    AlertDialogContent: {
        root: {
            class: "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-vueda-modal border p-6 shadow-vueda-overlay duration-200 sm:max-w-lg",
        },
        overlay: {
            class: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-overlay",
        },
    },
    AlertDialogDescription: {
        root: {
            class: "text-muted-foreground text-sm",
        },
    },
    AlertDialogFooter: {
        root: {
            class: "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        },
    },
    AlertDialogHeader: {
        root: {
            class: "flex flex-col gap-2 text-center sm:text-left",
        },
    },
    AlertDialogTitle: {
        root: {
            class: "text-lg font-semibold",
        },
    },

    // collapsible
    Collapsible: {
        root: { class: "" },
    },
    CollapsibleContent: {
        root: { class: "" },
    },
    CollapsibleTrigger: {
        root: { class: "" },
    },

    // card
    Card: {
        root: {
            class: "bg-card text-card-foreground flex flex-col gap-6 rounded-vueda-card border py-6 shadow-vueda-card",
        },
    },
    CardHeader: {
        root: {
            class: "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        },
    },
    CardTitle: {
        root: {
            class: "leading-none font-semibold",
        },
    },
    CardDescription: {
        root: {
            class: "text-muted-foreground text-sm",
        },
    },
    CardAction: {
        root: {
            class: "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        },
    },
    CardContent: {
        root: {
            class: "px-6",
        },
    },
    CardFooter: {
        root: {
            class: "flex items-center px-6 [.border-t]:pt-6",
        },
    },

    // dialog
    DialogContent: {
        root: {
            class: "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-vueda-modal border p-6 shadow-vueda-overlay duration-200 sm:max-w-lg",
        },
        close: {
            class: "data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none text-sm leading-none",
        },
    },
    DialogDescription: {
        root: {
            class: "text-muted-foreground text-sm",
        },
    },
    DialogFooter: {
        root: {
            class: "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        },
    },
    DialogHeader: {
        root: {
            class: "flex flex-col gap-2 text-center sm:text-left",
        },
    },
    DialogOverlay: {
        root: {
            class: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-overlay",
        },
    },
    DialogScrollContent: {
        root: {
            class: "relative z-50 grid w-full max-w-lg my-8 gap-4 border border-border bg-background p-6 shadow-vueda-overlay duration-200 sm:rounded-vueda-modal md:w-full",
        },
        overlay: {
            class: "fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-overlay data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        },
        close: {
            class: "absolute top-4 right-4 p-0.5 transition-colors rounded-md hover:bg-secondary",
        },
    },
    DialogTitle: {
        root: {
            class: "text-lg leading-none font-semibold",
        },
    },

    // field
    Field: {
        root: ({ orientation }) => {
            const base = "group/field flex w-full gap-3 data-[invalid=true]:text-destructive";
            if (orientation === "horizontal") {
                return {
                    class: [
                        base,
                        "flex-row items-start",
                        "[&>[data-slot=field-label]]:w-48 [&>[data-slot=field-label]]:shrink-0 [&>[data-slot=field-label]]:pt-2 [&>[data-slot=field-label]]:text-right [&>[data-slot=field-label]]:justify-end",
                        "has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
                    ],
                };
            }
            if (orientation === "responsive") {
                return {
                    class: [
                        base,
                        "flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:flex-row @md/field-group:items-start @md/field-group:[&>*]:w-auto",
                        "@md/field-group:[&>[data-slot=field-label]]:w-48 @md/field-group:[&>[data-slot=field-label]]:shrink-0 @md/field-group:[&>[data-slot=field-label]]:pt-2 @md/field-group:[&>[data-slot=field-label]]:text-right @md/field-group:[&>[data-slot=field-label]]:justify-end",
                        "@md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
                    ],
                };
            }
            // vertical (default)
            return {
                class: [base, "flex-col [&>*]:w-full [&>.sr-only]:w-auto"],
            };
        },
    },
    FieldContent: {
        root: {
            class: "group/field-content flex flex-1 flex-col gap-1.5 leading-snug",
        },
    },
    FieldDescription: {
        root: {
            class: [
                "text-muted-foreground text-[length:var(--vueda-text-supporting)] leading-[1.4] font-normal group-has-[[data-orientation=horizontal]]/field:text-balance",
                "last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5",
                "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
            ],
        },
    },
    FieldGroup: {
        root: {
            class: "group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4",
        },
    },
    FieldLabel: {
        root: {
            class: [
                "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50",
                "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4",
                "has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary dark:has-data-[state=checked]:bg-primary/10",
            ],
        },
    },
    FieldLegend: {
        root: {
            class: "mb-3 font-medium data-[variant=legend]:text-base data-[variant=label]:text-sm",
        },
    },
    FieldMessage: {
        root: ({ severity }) => ({
            class: [
                "text-[length:var(--vueda-text-supporting)] leading-[1.4] font-medium",
                severity === "error" ? "text-destructive" : "text-warning",
            ],
        }),
        list: {
            class: "ml-4 flex list-disc flex-col gap-1",
        },
    },
    FieldSeparator: {
        root: {
            class: "relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
        },
        line: {
            class: "absolute inset-0 top-1/2",
        },
        content: {
            class: "bg-background text-muted-foreground relative mx-auto block w-fit px-2",
        },
    },
    FieldSet: {
        root: {
            class: [
                "flex flex-col gap-6",
                "has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
            ],
        },
    },
    FieldTitle: {
        root: {
            class: "flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50",
        },
    },

    // hover-card
    HoverCardTrigger: {
        root: { class: "" },
    },
    HoverCardContent: {
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 rounded-vueda-control border p-4 shadow-vueda-popover outline-hidden",
        },
    },

    // item
    Item: {
        root: ({ variant, size }) => {
            const variantClass =
                variant === "outline" ? "border-border" : variant === "muted" ? "bg-muted/50" : "bg-transparent";
            const sizeClass = size === "sm" ? "py-3 px-4 gap-2.5" : "p-4 gap-4";
            return {
                class: [
                    "group/item flex items-center border border-transparent text-sm rounded-md transition-colors [a]:hover:bg-accent/50 [a]:transition-colors duration-100 flex-wrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    variantClass,
                    sizeClass,
                ],
            };
        },
    },
    ItemActions: {
        root: {
            class: "flex items-center gap-2",
        },
    },
    ItemContent: {
        root: {
            class: "flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none",
        },
    },
    ItemDescription: {
        root: {
            class: [
                "text-muted-foreground line-clamp-2 text-sm leading-normal font-normal text-balance",
                "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
            ],
        },
    },
    ItemFooter: {
        root: {
            class: "flex basis-full items-center justify-between gap-2 font-mono text-[length:var(--vueda-text-supporting)] text-muted-foreground",
        },
    },
    ItemGroup: {
        root: {
            class: "group/item-group flex flex-col",
        },
    },
    ItemHeader: {
        root: {
            class: "flex basis-full items-center justify-between gap-2 font-mono text-[length:var(--vueda-text-supporting)] text-muted-foreground",
        },
    },
    ItemMedia: {
        root: ({ variant }) => {
            const variantClass =
                variant === "icon"
                    ? "size-8 border rounded-sm bg-muted [&_svg:not([class*='size-'])]:size-4"
                    : variant === "image"
                      ? "size-10 rounded-sm overflow-hidden [&_img]:size-full [&_img]:object-cover"
                      : "bg-transparent";
            return {
                class: [
                    "flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none group-has-[[data-slot=item-description]]/item:translate-y-0.5",
                    variantClass,
                ],
            };
        },
    },
    ItemSeparator: {
        root: {
            class: "my-0",
        },
    },
    ItemTitle: {
        root: {
            class: "flex w-fit items-center gap-2 text-sm leading-snug font-medium",
        },
    },

    // label
    Label: {
        root: {
            class: "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        },
    },

    // popover
    PopoverContent: {
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 rounded-vueda-control border p-4 shadow-vueda-popover origin-(--reka-popover-content-transform-origin) outline-hidden",
        },
    },

    // resizable
    ResizableHandle: {
        root: {
            class: "bg-border relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-1 data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:-translate-y-1/2 data-[orientation=vertical]:after:translate-x-0 [&[data-orientation=vertical]>div]:rotate-90",
        },
        handle: {
            class: "bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border",
        },
    },
    ResizablePanelGroup: {
        root: {
            class: "flex h-full w-full data-[orientation=vertical]:flex-col",
        },
    },

    // scroll-area
    ScrollArea: {
        root: {
            class: "relative",
        },
        viewport: {
            class: "size-full rounded-[inherit] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        },
    },
    ScrollBar: {
        root: ({ orientation }) => ({
            class: [
                "flex touch-none p-px transition-colors select-none",
                orientation === "horizontal"
                    ? "h-2.5 flex-col border-t border-t-transparent"
                    : "h-full w-2.5 border-l border-l-transparent",
            ],
        }),
        thumb: {
            class: "bg-border relative flex-1 rounded-full",
        },
    },

    // separator
    Separator: {
        root: {
            class: "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        },
    },

    // drawer
    DrawerContent: {
        root: {
            class: "group/drawer-content bg-background fixed z-50 flex h-auto flex-col data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-vueda-modal data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-vueda-modal data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:sm:max-w-sm data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:sm:max-w-sm",
        },
        handle: {
            class: "bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block",
        },
    },
    DrawerDescription: {
        root: {
            class: "text-muted-foreground text-sm",
        },
    },
    DrawerFooter: {
        root: {
            class: "mt-auto flex flex-col gap-2 p-4",
        },
    },
    DrawerHeader: {
        root: {
            class: "flex flex-col gap-1.5 p-4",
        },
    },
    DrawerOverlay: {
        root: {
            class: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-overlay",
        },
    },
    DrawerTitle: {
        root: {
            class: "text-foreground font-semibold",
        },
    },

    // sheet
    SheetContent: {
        root: ({ side }) => {
            const sideClasses = {
                right: "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
                left: "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
                top: "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
                bottom: "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
            };
            return {
                class: [
                    "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-vueda-overlay transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
                    sideClasses[side] || sideClasses.right,
                ],
            };
        },
        close: {
            class: "data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none text-sm leading-none",
        },
    },
    SheetDescription: {
        root: {
            class: "text-muted-foreground text-sm",
        },
    },
    SheetFooter: {
        root: {
            class: "mt-auto flex flex-col gap-2 p-4",
        },
    },
    SheetHeader: {
        root: {
            class: "flex flex-col gap-1.5 p-4",
        },
    },
    SheetOverlay: {
        root: {
            class: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-overlay",
        },
    },
    SheetTitle: {
        root: {
            class: "text-foreground font-semibold",
        },
    },

    // stepper
    Stepper: {
        root: {
            class: "flex gap-2",
        },
    },
    StepperItem: {
        root: {
            class: "flex items-center gap-2 group data-[disabled]:pointer-events-none",
        },
    },
    StepperTrigger: {
        root: {
            class: "p-1 flex flex-col items-center text-center gap-1 rounded-md",
        },
    },
    StepperIndicator: {
        root: {
            class: [
                "inline-flex items-center justify-center rounded-full text-muted-foreground/50 w-8 h-8",
                "group-data-[disabled]:text-muted-foreground group-data-[disabled]:opacity-50",
                "group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground",
                "group-data-[state=completed]:bg-accent group-data-[state=completed]:text-accent-foreground",
            ],
        },
    },
    StepperTitle: {
        root: {
            class: "text-md font-semibold whitespace-nowrap",
        },
    },
    StepperDescription: {
        root: {
            class: "text-xs text-muted-foreground",
        },
    },
    StepperSeparator: {
        root: {
            class: [
                "flex-1 h-0.5 min-w-6 rounded-sm mt-4 transition-colors",
                "bg-muted",
                "group-data-[disabled]:bg-muted group-data-[disabled]:opacity-50",
                "group-data-[state=completed]:bg-accent",
            ],
        },
    },

    // tabs
    Tabs: {
        root: {
            class: "flex flex-col gap-2",
        },
    },
    TabsContent: {
        root: {
            class: "flex-1 outline-none",
        },
    },
    TabsList: {
        root: {
            class: "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        },
    },
    TabsTrigger: {
        root: {
            class: "data-[state=active]:bg-background dark:data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-vueda-control border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
    },

    // tooltip
    TooltipContent: {
        root: {
            class: "bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit rounded-vueda-control px-3 py-1.5 text-xs text-balance",
        },
        arrow: {
            class: "bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]",
        },
    },
};
