/**
 * @module theme/vueda-tailwind/display
 * @description Tailwind CSS pass-through theme configuration for VUEDA Client display and read-only components.
 */

export default {
    DateRangeDisplay: {
        root: {
            class: "whitespace-nowrap",
        },
        separator: {
            class: "",
        },
        from: {
            class: "",
        },
        to: {
            class: "",
        },
    },
    DateTimeDisplay: {
        root: {
            class: "flex items-center space-x-2",
        },
        inline: {
            class: "whitespace-nowrap",
        },
        break: {
            absolute: "whitespace-nowrap",
            relative: "whitespace-nowrap mt-1",
        },
        absolute: {
            class: "whitespace-nowrap",
        },
        relative: {
            class: "whitespace-nowrap",
        },
        tooltip: {
            class: "cursor-help",
        },
        dash: {
            class: "",
        },
    },
    ErrorDisplay: {
        root: {
            class: "w-full",
        },
        container: {
            class: "max-w-full overflow-x-auto p-1 2xs:p-2 2xl:p-4 flex flex-col gap-2",
        },
        message: {
            class: [],
        },
        codeBlock: {
            class: "bg-neutral-100 dark:bg-neutral-800 p-1 2xs:p-2 2xl:p-4 rounded", // Styling for the code block
        },
        link: {
            class: "underline",
        },
    },
    ClickToCopyText: {
        root: {
            class: "flex flex-row items-baseline gap-1 p-1 2xs:p-2 2xl:p-4 ",
        },
    },
    DisplayBadge: {
        root: ({ variant }) => ({
            class: [
                "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
                {
                    "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90":
                        !variant || variant === "default",
                    "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90":
                        variant === "secondary",
                    "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60":
                        variant === "destructive",
                    "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground": variant === "outline",
                },
            ],
        }),
    },
    DisplayKbd: {
        root: {
            class: [
                "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium select-none",
                "[&_svg:not([class*='size-'])]:size-3",
                "[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
            ],
        },
    },
    DisplayKbdGroup: {
        root: {
            class: "inline-flex items-center gap-1",
        },
    },

    // avatar
    DisplayAvatar: {
        root: {
            class: "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        },
    },
    DisplayAvatarImage: {
        root: {
            class: "aspect-square size-full",
        },
    },
    DisplayAvatarFallback: {
        root: {
            class: "bg-muted flex size-full items-center justify-center rounded-full",
        },
    },
    MobileSortComponent: {
        drawer: {
            class: ["!h-auto"],
        },
        drawerInner: {
            class: ["flex flex-col gap-4"],
        },
        draggable: {
            class: ["flex flex-col gap-2"],
        },
        draggableItem: {
            class: ["flex flex-row rounded-lg border border-neutral-200 p-3"],
        },
        draggableItemInner: {
            class: ["select-none flex flex-row gap-3 items-center justify-between grow flex-1"],
        },
        dragHandle: {
            class: ["drag-handle cursor-grab active:cursor-grabbing p-1"],
        },
        sortOrderText: {
            class: ["w-3 text-sm font-semibold text-neutral-500"],
        },
        select: {
            class: ["w-full"],
        },
        sortInlineActionBar: {
            class: ["flex flex-row content-baseline justify-end"],
        },
        actionBar: {
            class: ["flex flex-col gap-2"],
        },
    },
};
