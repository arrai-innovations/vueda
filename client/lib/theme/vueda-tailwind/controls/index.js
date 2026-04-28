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
    Button: {
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
                    "h-vueda-control px-vueda-control-px has-[>svg]:px-vueda-control-px-sm":
                        !size || size === "default",
                    "h-vueda-control-sm rounded-vueda-control gap-1.5 px-vueda-control-px-sm has-[>svg]:px-vueda-control-px-sm":
                        size === "sm",
                    "h-vueda-control-lg rounded-vueda-control px-vueda-control-px-lg has-[>svg]:px-vueda-control-px":
                        size === "lg",
                    "size-vueda-control": size === "icon",
                    "size-vueda-control-sm": size === "icon-sm",
                    "size-vueda-control-lg": size === "icon-lg",
                },
            ],
        }),
    },
    FileUpload: {
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
            class: [
                ...BUTTON_BASE,
                BUTTON_VARIANT_OUTLINE,
                "h-vueda-control px-vueda-control-px has-[>svg]:px-vueda-control-px-sm",
            ],
        },
        dropMessage: {
            class: ["text-sm text-muted-foreground"],
        },
    },
    CalendarCellTrigger: {
        root: {
            class: [
                ...BUTTON_BASE,
                BUTTON_VARIANT_GHOST,
                "size-[var(--vueda-cal-day)] p-0 font-normal aria-selected:opacity-100 cursor-default",
                "[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground",
                "data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:opacity-100 data-[selected]:hover:bg-primary data-[selected]:hover:text-primary-foreground data-[selected]:focus:bg-primary data-[selected]:focus:text-primary-foreground",
                "data-[disabled]:text-muted-foreground data-[disabled]:opacity-50",
                "data-[unavailable]:text-destructive-foreground data-[unavailable]:line-through",
                "data-[outside-view]:text-muted-foreground",
            ],
        },
    },
    CalendarNavButton: {
        root: {
            class: [...BUTTON_BASE, BUTTON_VARIANT_OUTLINE, "size-7 bg-transparent p-0 opacity-50 hover:opacity-100"],
        },
    },
    RangeCalendarCellTrigger: {
        root: {
            class: [
                ...BUTTON_BASE,
                BUTTON_VARIANT_GHOST,
                "h-[var(--vueda-cal-day)] w-[var(--vueda-cal-day)] p-0 font-normal data-[selected]:opacity-100",
                "[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground",
                "data-[selection-start]:bg-primary data-[selection-start]:text-primary-foreground data-[selection-start]:hover:bg-primary data-[selection-start]:hover:text-primary-foreground data-[selection-start]:focus:bg-primary data-[selection-start]:focus:text-primary-foreground",
                "data-[selection-end]:bg-primary data-[selection-end]:text-primary-foreground data-[selection-end]:hover:bg-primary data-[selection-end]:hover:text-primary-foreground data-[selection-end]:focus:bg-primary data-[selection-end]:focus:text-primary-foreground",
                "data-[outside-view]:text-muted-foreground",
                "data-[disabled]:text-muted-foreground data-[disabled]:opacity-50",
                "data-[unavailable]:text-destructive-foreground data-[unavailable]:line-through",
            ],
        },
    },
    RangeCalendarNextButton: {
        root: {
            class: [
                ...BUTTON_BASE,
                BUTTON_VARIANT_OUTLINE,
                "absolute right-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
            ],
        },
    },
    RangeCalendarPrevButton: {
        root: {
            class: [
                ...BUTTON_BASE,
                BUTTON_VARIANT_OUTLINE,
                "absolute left-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
            ],
        },
    },
    RangeCalendar: {
        root: {
            class: ["p-3"],
        },
    },
    RangeCalendarCell: {
        root: {
            class: [
                "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([data-selected])]:bg-accent first:[&:has([data-selected])]:rounded-l-md last:[&:has([data-selected])]:rounded-r-md [&:has([data-selected][data-selection-end])]:rounded-r-md [&:has([data-selected][data-selection-start])]:rounded-l-md",
            ],
        },
    },
    RangeCalendarGrid: {
        root: {
            class: ["w-full border-collapse space-x-1"],
        },
    },
    RangeCalendarGridRow: {
        root: {
            class: ["flex"],
        },
    },
    RangeCalendarHeadCell: {
        root: {
            class: ["w-[var(--vueda-cal-cell)] rounded-md text-[0.8rem] font-normal text-muted-foreground"],
        },
    },
    RangeCalendarHeader: {
        root: {
            class: ["flex justify-center pt-1 relative items-center w-full"],
        },
    },
    RangeCalendarHeading: {
        root: {
            class: ["text-sm font-medium"],
        },
    },
    CalendarCell: {
        root: {
            class: [
                "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1 [&:has([data-selected])]:rounded-md [&:has([data-selected])]:bg-accent",
            ],
        },
    },
    CalendarGridRow: {
        root: {
            class: ["flex"],
        },
    },
    CalendarGrid: {
        root: {
            class: ["w-full border-collapse space-x-1"],
        },
    },
    CalendarHeadCell: {
        root: {
            class: ["text-muted-foreground rounded-md w-[var(--vueda-cal-cell)] font-normal text-[0.8rem]"],
        },
    },
    CalendarHeader: {
        root: {
            class: ["flex justify-center pt-1 relative items-center w-full px-8"],
        },
    },
    CalendarHeading: {
        root: {
            class: ["text-sm font-medium"],
        },
    },
    Calendar: {
        root: {
            class: ["p-3"],
        },
    },
    ComboboxAnchor: {
        root: {
            class: ["w-[200px]"],
        },
    },
    ComboboxEmpty: {
        root: {
            class: ["py-6 text-center text-sm"],
        },
    },
    ComboboxGroup: {
        root: {
            class: ["overflow-hidden p-1 text-foreground"],
        },
    },
    ComboboxInput: {
        root: {
            class: [
                "placeholder:text-muted-foreground flex h-vueda-control-lg w-full rounded-vueda-control bg-transparent text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },
    ComboboxItem: {
        root: {
            class: [
                "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },
    ComboboxItemIndicator: {
        root: {
            class: ["ml-auto"],
        },
    },
    ComboboxList: {
        root: {
            class: [
                "z-50 w-[200px] rounded-vueda-control border bg-popover text-popover-foreground origin-(--reka-combobox-content-transform-origin) overflow-hidden shadow-vueda-popover outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            ],
        },
    },
    ComboboxSeparator: {
        root: {
            class: ["bg-border -mx-1 h-px"],
        },
    },
    ComboboxTrigger: {
        root: {
            class: [""],
        },
    },
    ComboboxViewport: {
        root: {
            class: ["max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto"],
        },
    },
    DateFieldInput: {
        root: {
            class: [
                "inline rounded-sm px-0.5 text-center tabular-nums caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder]:text-muted-foreground",
            ],
        },
    },
    DateField: {
        root: {
            class: [
                "flex w-full rounded-vueda-control border border-input bg-transparent px-vueda-control-px py-1 text-sm shadow-vueda-control transition-colors focus-within:border-ring focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring data-[readonly]:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },
    DateRangeFieldInput: {
        root: {
            class: [
                "inline rounded-sm px-0.5 text-center tabular-nums caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder]:text-muted-foreground",
            ],
        },
    },
    DateRangeField: {
        root: {
            class: [
                "flex w-full rounded-vueda-control border border-input bg-transparent px-vueda-control-px py-1 text-sm shadow-vueda-control transition-colors focus-within:border-ring focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring data-[readonly]:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },
    Input: {
        root: {
            class: [
                "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-vueda-control w-full min-w-0 rounded-vueda-control border bg-transparent px-vueda-control-px text-base shadow-vueda-control transition-colors file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                "focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive",
                "read-only:bg-muted/50 read-only:cursor-default",
            ],
        },
    },
    InputGroupAddon: {
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
    InputGroupButton: {
        root: ({ size }) => ({
            class: [
                "text-sm shadow-none flex gap-2 items-center",
                {
                    "h-6 gap-1 px-2 rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-3.5 has-[>svg]:px-2":
                        !size || size === "xs",
                    "h-vueda-control-sm px-vueda-control-px-sm gap-1.5 rounded-vueda-control has-[>svg]:px-vueda-control-px-sm":
                        size === "sm",
                    "size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0": size === "icon-xs",
                    "size-vueda-control-sm p-0 has-[>svg]:p-0": size === "icon-sm",
                },
            ],
        }),
    },
    InputGroupInput: {
        root: {
            class: ["flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"],
        },
    },
    InputGroupText: {
        root: {
            class: [
                "text-muted-foreground flex items-center gap-2 text-sm [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },
    InputGroupTextarea: {
        root: {
            class: [
                "flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent",
            ],
        },
    },
    InputGroup: {
        root: {
            class: [
                "group/input-group border-input dark:bg-input/30 relative flex w-full items-center rounded-vueda-control border shadow-vueda-control transition-colors",
                "h-vueda-control min-w-0 has-[>textarea]:h-auto",
                "has-[>[data-align=inline-start]]:[&>input]:pl-2",
                "has-[>[data-align=inline-end]]:[&>input]:pr-2",
                "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3",
                "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3",
                "has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:outline-2 has-[[data-slot=input-group-control]:focus-visible]:outline-offset-2 has-[[data-slot=input-group-control]:focus-visible]:outline-ring",
                "has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]:focus-visible]:outline-destructive",
            ],
        },
    },
    InputOTPGroup: {
        root: {
            class: ["flex items-center"],
        },
    },
    InputOTPSlot: {
        root: {
            class: [
                "data-[active=true]:border-ring data-[active=true]:outline-2 data-[active=true]:outline-offset-2 data-[active=true]:outline-ring data-[active=true]:aria-invalid:outline-destructive aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive dark:bg-input/30 border-input relative flex h-vueda-control w-vueda-control items-center justify-center border-y border-r text-sm shadow-vueda-control transition-all first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10",
            ],
        },
    },
    InputOTP: {
        root: {
            class: ["flex items-center gap-2 has-disabled:opacity-50"],
        },
    },
    NativeSelect: {
        root: {
            class: [
                "border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 dark:hover:bg-input/50 h-vueda-control w-full min-w-0 appearance-none rounded-vueda-control border bg-transparent px-vueda-control-px pr-9 text-sm shadow-vueda-control transition-colors disabled:pointer-events-none disabled:cursor-not-allowed",
                "focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive",
            ],
        },
    },
    NativeSelectOptGroup: {
        root: {
            class: ["bg-popover text-popover-foreground"],
        },
    },
    NativeSelectOption: {
        root: {
            class: ["bg-popover text-popover-foreground"],
        },
    },
    NumberField: {
        root: {
            class: ["grid gap-1.5"],
        },
    },
    NumberFieldContent: {
        root: {
            class: [
                "relative [&>[data-slot=input]]:has-[[data-slot=increment]]:pr-5 [&>[data-slot=input]]:has-[[data-slot=decrement]]:pl-5",
            ],
        },
    },
    NumberFieldDecrement: {
        root: {
            class: ["absolute top-1/2 -translate-y-1/2 left-0 p-3 disabled:cursor-not-allowed disabled:opacity-20"],
        },
    },
    NumberFieldIncrement: {
        root: {
            class: ["absolute top-1/2 -translate-y-1/2 right-0 disabled:cursor-not-allowed disabled:opacity-20 p-3"],
        },
    },
    NumberFieldInput: {
        root: {
            class: [
                "flex h-vueda-control w-full rounded-vueda-control border border-input bg-transparent text-sm text-center shadow-vueda-control transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },
    RadioGroupItem: {
        root: {
            class: [
                "border-input text-primary focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border shadow-vueda-control transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },
    ButtonGroup: {
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
    ButtonGroupSeparator: {
        root: {
            class: ["bg-input relative !m-0 self-stretch data-[orientation=vertical]:h-auto"],
        },
    },
    ButtonGroupText: {
        root: {
            class: [
                "bg-muted flex items-center gap-2 rounded-vueda-control border px-4 text-sm font-medium shadow-vueda-control [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },
    Checkbox: {
        root: {
            class: [
                "peer border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:border-primary focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive size-4 shrink-0 rounded-[4px] border shadow-vueda-control transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },
    Slider: {
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
    Switch: {
        root: {
            class: [
                "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-vueda-control transition-all disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
        thumb: {
            class: [
                "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0",
            ],
        },
    },
    Textarea: {
        root: {
            class: [
                "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-vueda-control border bg-transparent px-3 py-2 text-base shadow-vueda-control transition-colors disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            ],
        },
    },
    TimeField: {
        root: {
            class: [
                "flex w-full rounded-vueda-control border border-input bg-transparent px-vueda-control-px py-1 text-sm shadow-vueda-control transition-colors focus-within:border-ring focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring data-[readonly]:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },
    TimeFieldInput: {
        root: {
            class: [
                "inline rounded-sm px-0.5 text-center tabular-nums caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder]:text-muted-foreground",
            ],
        },
    },
    Toggle: {
        root: ({ variant, size }) => ({
            class: [
                "inline-flex items-center justify-center gap-2 rounded-vueda-control text-sm font-medium hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive whitespace-nowrap",
                {
                    "bg-transparent": !variant || variant === "default",
                    "border border-input bg-transparent shadow-vueda-control hover:bg-accent hover:text-accent-foreground":
                        variant === "outline",
                },
                {
                    "h-vueda-control px-2 min-w-vueda-control": !size || size === "default",
                    "h-vueda-control-sm px-1.5 min-w-vueda-control-sm": size === "sm",
                    "h-vueda-control-lg px-2.5 min-w-vueda-control-lg": size === "lg",
                },
            ],
        }),
    },
    ToggleGroup: {
        root: {
            class: [
                "group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-vueda-control data-[spacing=default]:data-[variant=outline]:shadow-vueda-control",
            ],
        },
    },
    ToggleGroupItem: {
        root: ({ variant, size }) => ({
            class: [
                "inline-flex items-center justify-center gap-2 rounded-vueda-control text-sm font-medium hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive whitespace-nowrap",
                {
                    "bg-transparent": !variant || variant === "default",
                    "border border-input bg-transparent shadow-vueda-control hover:bg-accent hover:text-accent-foreground":
                        variant === "outline",
                },
                {
                    "h-vueda-control px-2 min-w-vueda-control": !size || size === "default",
                    "h-vueda-control-sm px-1.5 min-w-vueda-control-sm": size === "sm",
                    "h-vueda-control-lg px-2.5 min-w-vueda-control-lg": size === "lg",
                },
                "w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10",
                "data-[spacing=0]:rounded-none data-[spacing=0]:shadow-none data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md data-[spacing=0]:data-[variant=outline]:border-l-0 data-[spacing=0]:data-[variant=outline]:first:border-l",
            ],
        }),
    },
    RadioGroup: {
        root: {
            class: ["grid gap-3"],
        },
    },
    SelectContent: {
        root: ({ position }) => ({
            class: [
                "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--reka-select-content-available-height) min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-vueda-control border shadow-vueda-popover",
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
    SelectItem: {
        root: {
            class: [
                "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
            ],
        },
    },
    SelectLabel: {
        root: {
            class: ["text-muted-foreground px-2 py-1.5 text-xs"],
        },
    },
    SelectScrollDownButton: {
        root: {
            class: ["flex cursor-default items-center justify-center py-1"],
        },
    },
    SelectScrollUpButton: {
        root: {
            class: ["flex cursor-default items-center justify-center py-1"],
        },
    },
    SelectSeparator: {
        root: {
            class: ["bg-border pointer-events-none -mx-1 my-1 h-px"],
        },
    },
    SelectTrigger: {
        root: {
            class: [
                "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-vueda-control border bg-transparent px-vueda-control-px text-sm whitespace-nowrap shadow-vueda-control transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-vueda-control data-[size=sm]:h-vueda-control-sm *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },
    TagsInput: {
        root: {
            class: [
                "flex flex-wrap gap-2 items-center rounded-vueda-control border border-input bg-background px-2 py-1 text-sm shadow-vueda-control transition-colors",
                "focus-within:border-ring focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
                "aria-invalid:border-destructive aria-invalid:focus-within:outline-destructive",
            ],
        },
    },
    TagsInputItem: {
        root: {
            class: [
                "flex h-[var(--vueda-chip-height)] items-center rounded-md bg-secondary data-[state=active]:outline-2 data-[state=active]:outline-offset-2 data-[state=active]:outline-ring",
            ],
        },
    },
    TagsInputInput: {
        root: {
            class: ["text-sm min-h-[var(--vueda-chip-height)] focus:outline-none flex-1 bg-transparent px-1"],
        },
    },
    TagsInputItemDelete: {
        root: {
            class: ["flex rounded bg-transparent mr-1"],
        },
    },
    TagsInputItemText: {
        root: {
            class: ["py-0.5 px-2 text-sm rounded bg-transparent"],
        },
    },
    Command: {
        root: {
            class: ["bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md"],
        },
    },
    CommandInput: {
        root: {
            class: [
                "placeholder:text-muted-foreground flex h-[var(--vueda-cmd-input-height)] w-full rounded-vueda-control bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
        wrapper: { class: "flex h-[var(--vueda-cmd-input-height)] items-center gap-2 border-b px-3" },
    },
    CommandList: {
        root: {
            class: ["max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto"],
        },
    },
    CommandEmpty: {
        root: {
            class: ["py-6 text-center text-sm"],
        },
    },
    CommandGroup: {
        root: {
            class: ["text-foreground overflow-hidden p-1"],
        },
        heading: { class: "px-2 py-1.5 text-xs font-medium text-muted-foreground" },
    },
    CommandItem: {
        root: {
            class: [
                "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },
    CommandSeparator: {
        root: {
            class: ["bg-border -mx-1 h-px"],
        },
    },
    CommandShortcut: {
        root: {
            class: ["text-muted-foreground ml-auto text-xs tracking-widest"],
        },
    },
    CommandDialog: {
        content: { class: "overflow-hidden p-0" },
        header: { class: "sr-only" },
    },
};
