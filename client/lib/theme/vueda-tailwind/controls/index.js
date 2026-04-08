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
};
