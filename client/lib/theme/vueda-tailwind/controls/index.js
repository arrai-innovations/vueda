/**
 * @module theme/vueda-tailwind/controls
 * @description Tailwind CSS theme configuration for VUEDA Client control primitives.
 */
import {
    BUTTON_BASE,
    BUTTON_VARIANT_DEFAULT,
    BUTTON_VARIANT_DESTRUCTIVE,
    BUTTON_VARIANT_GHOST,
    BUTTON_VARIANT_LINK,
    BUTTON_VARIANT_OUTLINE,
    BUTTON_VARIANT_SECONDARY,
} from "@vueda/theme/vueda-tailwind/_shared.js";

export default {
    ControlButton: {
        root: ({ variant, size }) => ({
            class: [
                ...BUTTON_BASE,
                {
                    [BUTTON_VARIANT_DEFAULT]: !variant || variant === "default",
                    [BUTTON_VARIANT_DESTRUCTIVE]: variant === "destructive",
                    [BUTTON_VARIANT_OUTLINE]: variant === "outline",
                    [BUTTON_VARIANT_SECONDARY]: variant === "secondary",
                    [BUTTON_VARIANT_GHOST]: variant === "ghost",
                    [BUTTON_VARIANT_LINK]: variant === "link",
                },
                {
                    "h-9 px-4 py-2 has-[>svg]:px-3": !size || size === "default",
                    "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5": size === "sm",
                    "h-10 rounded-md px-6 has-[>svg]:px-4": size === "lg",
                    "size-9": size === "icon",
                    "size-8": size === "icon-sm",
                    "size-10": size === "icon-lg",
                },
            ],
        }),
    },
    ControlFileUpload: {
        root: ({ dropzone, dragging, disabled }) => ({
            class: [
                "inline-flex flex-col items-center gap-1",
                {
                    "rounded-lg border-2 border-dashed border-input p-6 transition-colors": dropzone,
                    "border-primary bg-primary/5": dropzone && dragging,
                    "opacity-50 cursor-not-allowed": disabled,
                },
            ],
        }),
        trigger: {
            class: [...BUTTON_BASE, BUTTON_VARIANT_OUTLINE, "h-9 px-4 py-2 has-[>svg]:px-3"],
        },
        dropMessage: {
            class: ["text-sm text-muted-foreground"],
        },
    },
    ControlCalendarCellTrigger: {
        root: {
            class: [
                ...BUTTON_BASE,
                BUTTON_VARIANT_GHOST,
                "size-8 p-0 font-normal aria-selected:opacity-100 cursor-default",
                "[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground",
                "data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:opacity-100 data-[selected]:hover:bg-primary data-[selected]:hover:text-primary-foreground data-[selected]:focus:bg-primary data-[selected]:focus:text-primary-foreground",
                "data-[disabled]:text-muted-foreground data-[disabled]:opacity-50",
                "data-[unavailable]:text-destructive-foreground data-[unavailable]:line-through",
                "data-[outside-view]:text-muted-foreground",
            ],
        },
    },
    ControlCalendarNavButton: {
        root: {
            class: [...BUTTON_BASE, BUTTON_VARIANT_OUTLINE, "size-7 bg-transparent p-0 opacity-50 hover:opacity-100"],
        },
    },
    ControlRangeCalendarCellTrigger: {
        root: {
            class: [
                ...BUTTON_BASE,
                BUTTON_VARIANT_GHOST,
                "h-8 w-8 p-0 font-normal data-[selected]:opacity-100",
                "[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground",
                "data-[selection-start]:bg-primary data-[selection-start]:text-primary-foreground data-[selection-start]:hover:bg-primary data-[selection-start]:hover:text-primary-foreground data-[selection-start]:focus:bg-primary data-[selection-start]:focus:text-primary-foreground",
                "data-[selection-end]:bg-primary data-[selection-end]:text-primary-foreground data-[selection-end]:hover:bg-primary data-[selection-end]:hover:text-primary-foreground data-[selection-end]:focus:bg-primary data-[selection-end]:focus:text-primary-foreground",
                "data-[outside-view]:text-muted-foreground",
                "data-[disabled]:text-muted-foreground data-[disabled]:opacity-50",
                "data-[unavailable]:text-destructive-foreground data-[unavailable]:line-through",
            ],
        },
    },
    ControlRangeCalendarNextButton: {
        root: {
            class: [
                ...BUTTON_BASE,
                BUTTON_VARIANT_OUTLINE,
                "absolute right-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
            ],
        },
    },
    ControlRangeCalendarPrevButton: {
        root: {
            class: [
                ...BUTTON_BASE,
                BUTTON_VARIANT_OUTLINE,
                "absolute left-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
            ],
        },
    },
    ControlRangeCalendar: {
        root: {
            class: ["p-3"],
        },
    },
    ControlRangeCalendarCell: {
        root: {
            class: [
                "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([data-selected])]:bg-accent first:[&:has([data-selected])]:rounded-l-md last:[&:has([data-selected])]:rounded-r-md [&:has([data-selected][data-selection-end])]:rounded-r-md [&:has([data-selected][data-selection-start])]:rounded-l-md",
            ],
        },
    },
    ControlRangeCalendarGrid: {
        root: {
            class: ["w-full border-collapse space-x-1"],
        },
    },
    ControlRangeCalendarGridRow: {
        root: {
            class: ["flex"],
        },
    },
    ControlRangeCalendarHeadCell: {
        root: {
            class: ["w-8 rounded-md text-[0.8rem] font-normal text-muted-foreground"],
        },
    },
    ControlRangeCalendarHeader: {
        root: {
            class: ["flex justify-center pt-1 relative items-center w-full"],
        },
    },
    ControlRangeCalendarHeading: {
        root: {
            class: ["text-sm font-medium"],
        },
    },
    ControlCalendarCell: {
        root: {
            class: [
                "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1 [&:has([data-selected])]:rounded-md [&:has([data-selected])]:bg-accent",
            ],
        },
    },
    ControlCalendarGridRow: {
        root: {
            class: ["flex"],
        },
    },
    ControlCalendarGrid: {
        root: {
            class: ["w-full border-collapse space-x-1"],
        },
    },
    ControlCalendarHeadCell: {
        root: {
            class: ["text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem]"],
        },
    },
    ControlCalendarHeader: {
        root: {
            class: ["flex justify-center pt-1 relative items-center w-full px-8"],
        },
    },
    ControlCalendarHeading: {
        root: {
            class: ["text-sm font-medium"],
        },
    },
    ControlCalendar: {
        root: {
            class: ["p-3"],
        },
    },
    ControlComboboxAnchor: {
        root: {
            class: ["w-[200px]"],
        },
    },
    ControlComboboxEmpty: {
        root: {
            class: ["py-6 text-center text-sm"],
        },
    },
    ControlComboboxGroup: {
        root: {
            class: ["overflow-hidden p-1 text-foreground"],
        },
    },
    ControlComboboxInput: {
        root: {
            class: [
                "placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },
    ControlComboboxItem: {
        root: {
            class: [
                "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },
    ControlComboboxItemIndicator: {
        root: {
            class: ["ml-auto"],
        },
    },
    ControlComboboxList: {
        root: {
            class: [
                "z-50 w-[200px] rounded-md border bg-popover text-popover-foreground origin-(--reka-combobox-content-transform-origin) overflow-hidden shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            ],
        },
    },
    ControlComboboxSeparator: {
        root: {
            class: ["bg-border -mx-1 h-px"],
        },
    },
    ControlComboboxTrigger: {
        root: {
            class: [""],
        },
    },
    ControlComboboxViewport: {
        root: {
            class: ["max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto"],
        },
    },
    ControlDateFieldInput: {
        root: {
            class: [
                "inline rounded-sm px-0.5 text-center tabular-nums caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder]:text-muted-foreground",
            ],
        },
    },
    ControlDateField: {
        root: {
            class: [
                "flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },
    ControlDateRangeFieldInput: {
        root: {
            class: [
                "inline rounded-sm px-0.5 text-center tabular-nums caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder]:text-muted-foreground",
            ],
        },
    },
    ControlDateRangeField: {
        root: {
            class: [
                "flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },
    ControlInput: {
        root: {
            class: [
                "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            ],
        },
    },
    ControlInputGroupAddon: {
        root: ({ align }) => ({
            class: [
                "text-muted-foreground flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium select-none [&>svg:not([class*='size-'])]:size-4 [&>kbd]:rounded-[calc(var(--radius)-5px)] group-data-[disabled=true]/input-group:opacity-50",
                {
                    "order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]":
                        !align || align === "inline-start",
                    "order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]": align === "inline-end",
                    "order-first w-full justify-start px-3 pt-3 [.border-b]:pb-3 group-has-[>input]/input-group:pt-2.5":
                        align === "block-start",
                    "order-last w-full justify-start px-3 pb-3 [.border-t]:pt-3 group-has-[>input]/input-group:pb-2.5":
                        align === "block-end",
                },
            ],
        }),
    },
    ControlInputGroupButton: {
        root: ({ size }) => ({
            class: [
                "text-sm shadow-none flex gap-2 items-center",
                {
                    "h-6 gap-1 px-2 rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-3.5 has-[>svg]:px-2":
                        !size || size === "xs",
                    "h-8 px-2.5 gap-1.5 rounded-md has-[>svg]:px-2.5": size === "sm",
                    "size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0": size === "icon-xs",
                    "size-8 p-0 has-[>svg]:p-0": size === "icon-sm",
                },
            ],
        }),
    },
    ControlInputGroupInput: {
        root: {
            class: ["flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"],
        },
    },
    ControlInputGroupText: {
        root: {
            class: [
                "text-muted-foreground flex items-center gap-2 text-sm [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },
    ControlInputGroupTextarea: {
        root: {
            class: [
                "flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent",
            ],
        },
    },
    ControlInputGroup: {
        root: {
            class: [
                "group/input-group border-input dark:bg-input/30 relative flex w-full items-center rounded-md border shadow-xs transition-[color,box-shadow] outline-none",
                "h-9 min-w-0 has-[>textarea]:h-auto",
                "has-[>[data-align=inline-start]]:[&>input]:pl-2",
                "has-[>[data-align=inline-end]]:[&>input]:pr-2",
                "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3",
                "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3",
                "has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot=input-group-control]:focus-visible]:ring-[3px]",
                "has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40",
            ],
        },
    },
    ControlInputOTPGroup: {
        root: {
            class: ["flex items-center"],
        },
    },
    ControlInputOTPSlot: {
        root: {
            class: [
                "data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:ring-destructive/20 dark:data-[active=true]:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive dark:bg-input/30 border-input relative flex h-9 w-9 items-center justify-center border-y border-r text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10 data-[active=true]:ring-[3px]",
            ],
        },
    },
    ControlInputOTP: {
        root: {
            class: ["flex items-center gap-2 has-disabled:opacity-50"],
        },
    },
    ControlNativeSelect: {
        root: {
            class: [
                "border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 dark:hover:bg-input/50 h-9 w-full min-w-0 appearance-none rounded-md border bg-transparent px-3 py-2 pr-9 text-sm shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            ],
        },
    },
    ControlNativeSelectOptGroup: {
        root: {
            class: ["bg-popover text-popover-foreground"],
        },
    },
    ControlNativeSelectOption: {
        root: {
            class: ["bg-popover text-popover-foreground"],
        },
    },
    ControlNumberField: {
        root: {
            class: ["grid gap-1.5"],
        },
    },
    ControlNumberFieldContent: {
        root: {
            class: [
                "relative [&>[data-slot=input]]:has-[[data-slot=increment]]:pr-5 [&>[data-slot=input]]:has-[[data-slot=decrement]]:pl-5",
            ],
        },
    },
    ControlNumberFieldDecrement: {
        root: {
            class: ["absolute top-1/2 -translate-y-1/2 left-0 p-3 disabled:cursor-not-allowed disabled:opacity-20"],
        },
    },
    ControlNumberFieldIncrement: {
        root: {
            class: ["absolute top-1/2 -translate-y-1/2 right-0 disabled:cursor-not-allowed disabled:opacity-20 p-3"],
        },
    },
    ControlNumberFieldInput: {
        root: {
            class: [
                "flex h-9 w-full rounded-md border border-input bg-transparent py-1 text-sm text-center shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },
    ControlPopoverContent: {
        root: {
            class: [
                "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 rounded-md border p-4 shadow-md origin-(--reka-popover-content-transform-origin) outline-hidden",
            ],
        },
    },
    ControlRadioGroupItem: {
        root: {
            class: [
                "border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },
    ControlButtonGroup: {
        root: ({ orientation }) => ({
            class: [
                "flex w-fit items-stretch [&>*]:focus-visible:z-10 [&>*]:focus-visible:relative [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md has-[>[data-slot=button-group]]:gap-2",
                {
                    "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none":
                        !orientation || orientation === "horizontal",
                    "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none":
                        orientation === "vertical",
                },
            ],
        }),
    },
    ControlButtonGroupSeparator: {
        root: {
            class: ["bg-input relative !m-0 self-stretch data-[orientation=vertical]:h-auto"],
        },
    },
    ControlButtonGroupText: {
        root: {
            class: [
                "bg-muted flex items-center gap-2 rounded-md border px-4 text-sm font-medium shadow-xs [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },
    ControlCheckbox: {
        root: {
            class: [
                "peer border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },
    ControlSlider: {
        root: {
            class: [
                "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
            ],
        },
        track: {
            class: [
                "bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
            ],
        },
        range: {
            class: ["bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"],
        },
        thumb: {
            class: [
                "bg-white border-primary ring-ring/50 block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
            ],
        },
    },
    ControlSwitch: {
        root: {
            class: [
                "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
        thumb: {
            class: [
                "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0",
            ],
        },
    },
    ControlTextarea: {
        root: {
            class: [
                "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            ],
        },
    },
    ControlTimeField: {
        root: {
            class: [
                "flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },
    ControlTimeFieldInput: {
        root: {
            class: [
                "inline rounded-sm px-0.5 text-center tabular-nums caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder]:text-muted-foreground",
            ],
        },
    },
    ControlToggle: {
        root: ({ variant, size }) => ({
            class: [
                "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap",
                {
                    "bg-transparent": !variant || variant === "default",
                    "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground":
                        variant === "outline",
                },
                {
                    "h-9 px-2 min-w-9": !size || size === "default",
                    "h-8 px-1.5 min-w-8": size === "sm",
                    "h-10 px-2.5 min-w-10": size === "lg",
                },
            ],
        }),
    },
    ControlToggleGroup: {
        root: {
            class: [
                "group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md data-[spacing=default]:data-[variant=outline]:shadow-xs",
            ],
        },
    },
    ControlToggleGroupItem: {
        root: ({ variant, size }) => ({
            class: [
                "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap",
                {
                    "bg-transparent": !variant || variant === "default",
                    "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground":
                        variant === "outline",
                },
                {
                    "h-9 px-2 min-w-9": !size || size === "default",
                    "h-8 px-1.5 min-w-8": size === "sm",
                    "h-10 px-2.5 min-w-10": size === "lg",
                },
                "w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10",
                "data-[spacing=0]:rounded-none data-[spacing=0]:shadow-none data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md data-[spacing=0]:data-[variant=outline]:border-l-0 data-[spacing=0]:data-[variant=outline]:first:border-l",
            ],
        }),
    },
    ControlRadioGroup: {
        root: {
            class: ["grid gap-3"],
        },
    },
    ControlSelectContent: {
        root: ({ position }) => ({
            class: [
                "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--reka-select-content-available-height) min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
                {
                    "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1":
                        position === "popper",
                },
            ],
        }),
        viewport: ({ position }) => ({
            class: [
                "p-1",
                {
                    "h-[var(--reka-select-trigger-height)] w-full min-w-[var(--reka-select-trigger-width)] scroll-my-1":
                        position === "popper",
                },
            ],
        }),
    },
    ControlSelectItem: {
        root: {
            class: [
                "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
            ],
        },
    },
    ControlSelectLabel: {
        root: {
            class: ["text-muted-foreground px-2 py-1.5 text-xs"],
        },
    },
    ControlSelectScrollDownButton: {
        root: {
            class: ["flex cursor-default items-center justify-center py-1"],
        },
    },
    ControlSelectScrollUpButton: {
        root: {
            class: ["flex cursor-default items-center justify-center py-1"],
        },
    },
    ControlSelectSeparator: {
        root: {
            class: ["bg-border pointer-events-none -mx-1 my-1 h-px"],
        },
    },
    ControlSelectTrigger: {
        root: {
            class: [
                "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },
};
