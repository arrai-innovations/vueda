/**
 * @module theme/vueda-tailwind/shell
 * @description Tailwind CSS theme configuration for VUEDA Client shell primitives.
 */
import { BUTTON_BASE, BUTTON_VARIANT_DEFAULT, BUTTON_VARIANT_OUTLINE } from "@vueda/theme/vueda-tailwind/_shared.js";

export default {
    // alert-dialog
    ShellAlertDialogAction: {
        root: {
            class: [...BUTTON_BASE, BUTTON_VARIANT_DEFAULT],
        },
    },
    ShellAlertDialogCancel: {
        root: {
            class: [...BUTTON_BASE, BUTTON_VARIANT_OUTLINE, "mt-2 sm:mt-0"],
        },
    },
    ShellAlertDialogContent: {
        root: {
            class: "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
        },
        overlay: {
            class: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80",
        },
    },
    ShellAlertDialogDescription: {
        root: {
            class: "text-muted-foreground text-sm",
        },
    },
    ShellAlertDialogFooter: {
        root: {
            class: "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        },
    },
    ShellAlertDialogHeader: {
        root: {
            class: "flex flex-col gap-2 text-center sm:text-left",
        },
    },
    ShellAlertDialogTitle: {
        root: {
            class: "text-lg font-semibold",
        },
    },

    // dialog
    ShellDialogContent: {
        root: {
            class: "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
        },
        close: {
            class: "ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none text-sm leading-none",
        },
    },
    ShellDialogDescription: {
        root: {
            class: "text-muted-foreground text-sm",
        },
    },
    ShellDialogFooter: {
        root: {
            class: "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        },
    },
    ShellDialogHeader: {
        root: {
            class: "flex flex-col gap-2 text-center sm:text-left",
        },
    },
    ShellDialogOverlay: {
        root: {
            class: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80",
        },
    },
    ShellDialogScrollContent: {
        root: {
            class: "relative z-50 grid w-full max-w-lg my-8 gap-4 border border-border bg-background p-6 shadow-lg duration-200 sm:rounded-lg md:w-full",
        },
        overlay: {
            class: "fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        },
        close: {
            class: "absolute top-4 right-4 p-0.5 transition-colors rounded-md hover:bg-secondary",
        },
    },
    ShellDialogTitle: {
        root: {
            class: "text-lg leading-none font-semibold",
        },
    },

    // field
    ShellField: {
        root: ({ orientation }) => {
            const base = "group/field flex w-full gap-3 data-[invalid=true]:text-destructive";
            if (orientation === "horizontal") {
                return {
                    class: [
                        base,
                        "flex-row items-center",
                        "[&>[data-slot=field-label]]:flex-auto",
                        "has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
                    ],
                };
            }
            if (orientation === "responsive") {
                return {
                    class: [
                        base,
                        "flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:flex-row @md/field-group:items-center @md/field-group:[&>*]:w-auto",
                        "@md/field-group:[&>[data-slot=field-label]]:flex-auto",
                        "@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
                    ],
                };
            }
            // vertical (default)
            return {
                class: [base, "flex-col [&>*]:w-full [&>.sr-only]:w-auto"],
            };
        },
    },
    ShellFieldContent: {
        root: {
            class: "group/field-content flex flex-1 flex-col gap-1.5 leading-snug",
        },
    },
    ShellFieldDescription: {
        root: {
            class: [
                "text-muted-foreground text-sm leading-normal font-normal group-has-[[data-orientation=horizontal]]/field:text-balance",
                "last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5",
                "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
            ],
        },
    },
    ShellFieldGroup: {
        root: {
            class: "group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4",
        },
    },
    ShellFieldLabel: {
        root: {
            class: [
                "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50",
                "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4",
                "has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary dark:has-data-[state=checked]:bg-primary/10",
            ],
        },
    },
    ShellFieldLegend: {
        root: {
            class: "mb-3 font-medium data-[variant=legend]:text-base data-[variant=label]:text-sm",
        },
    },
    ShellFieldMessage: {
        root: ({ severity }) => ({
            class: [
                "text-sm font-normal",
                severity === "error" ? "text-destructive" : "text-amber-600 dark:text-amber-500",
            ],
        }),
        list: {
            class: "ml-4 flex list-disc flex-col gap-1",
        },
    },
    ShellFieldSeparator: {
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
    ShellFieldSet: {
        root: {
            class: [
                "flex flex-col gap-6",
                "has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
            ],
        },
    },
    ShellFieldTitle: {
        root: {
            class: "flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50",
        },
    },

    // item
    ShellItem: {
        root: ({ variant, size }) => {
            const variantClass =
                variant === "outline" ? "border-border" : variant === "muted" ? "bg-muted/50" : "bg-transparent";
            const sizeClass = size === "sm" ? "py-3 px-4 gap-2.5" : "p-4 gap-4";
            return {
                class: [
                    "group/item flex items-center border border-transparent text-sm rounded-md transition-colors [a]:hover:bg-accent/50 [a]:transition-colors duration-100 flex-wrap outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                    variantClass,
                    sizeClass,
                ],
            };
        },
    },
    ShellItemActions: {
        root: {
            class: "flex items-center gap-2",
        },
    },
    ShellItemContent: {
        root: {
            class: "flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none",
        },
    },
    ShellItemDescription: {
        root: {
            class: [
                "text-muted-foreground line-clamp-2 text-sm leading-normal font-normal text-balance",
                "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
            ],
        },
    },
    ShellItemFooter: {
        root: {
            class: "flex basis-full items-center justify-between gap-2",
        },
    },
    ShellItemGroup: {
        root: {
            class: "group/item-group flex flex-col",
        },
    },
    ShellItemHeader: {
        root: {
            class: "flex basis-full items-center justify-between gap-2",
        },
    },
    ShellItemMedia: {
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
    ShellItemSeparator: {
        root: {
            class: "my-0",
        },
    },
    ShellItemTitle: {
        root: {
            class: "flex w-fit items-center gap-2 text-sm leading-snug font-medium",
        },
    },

    // label
    ShellLabel: {
        root: {
            class: "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        },
    },

    // popover
    ShellPopoverContent: {
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 rounded-md border p-4 shadow-md origin-(--reka-popover-content-transform-origin) outline-hidden",
        },
    },

    // resizable
    ShellResizableHandle: {
        root: {
            class: "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-1 data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:-translate-y-1/2 data-[orientation=vertical]:after:translate-x-0 [&[data-orientation=vertical]>div]:rotate-90",
        },
        handle: {
            class: "bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border",
        },
    },
    ShellResizablePanelGroup: {
        root: {
            class: "flex h-full w-full data-[orientation=vertical]:flex-col",
        },
    },

    // scroll-area
    ShellScrollArea: {
        root: {
            class: "relative",
        },
        viewport: {
            class: "focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1",
        },
    },
    ShellScrollBar: {
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
    ShellSeparator: {
        root: {
            class: "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        },
    },

    // sheet
    ShellSheetContent: {
        root: ({ side }) => {
            const sideClasses = {
                right: "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
                left: "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
                top: "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
                bottom: "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
            };
            return {
                class: [
                    "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
                    sideClasses[side] || sideClasses.right,
                ],
            };
        },
        close: {
            class: "ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none",
        },
    },
    ShellSheetDescription: {
        root: {
            class: "text-muted-foreground text-sm",
        },
    },
    ShellSheetFooter: {
        root: {
            class: "mt-auto flex flex-col gap-2 p-4",
        },
    },
    ShellSheetHeader: {
        root: {
            class: "flex flex-col gap-1.5 p-4",
        },
    },
    ShellSheetOverlay: {
        root: {
            class: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80",
        },
    },
    ShellSheetTitle: {
        root: {
            class: "text-foreground font-semibold",
        },
    },

    // tabs
    ShellTabs: {
        root: {
            class: "flex flex-col gap-2",
        },
    },
    ShellTabsContent: {
        root: {
            class: "flex-1 outline-none",
        },
    },
    ShellTabsList: {
        root: {
            class: "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        },
    },
    ShellTabsTrigger: {
        root: {
            class: "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
    },

    // tooltip
    ShellTooltipContent: {
        root: {
            class: "bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit rounded-md px-3 py-1.5 text-xs text-balance",
        },
        arrow: {
            class: "bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]",
        },
    },
};
