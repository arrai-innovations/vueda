/**
 * @module theme/vueda-tailwind/display
 * @description Tailwind CSS pass-through theme configuration for VUEDA Client display and read-only components.
 */

export default {
    AspectRatio: {
        root: { class: "" },
    },
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
    Badge: {
        root: ({ variant, numeric }) => ({
            class: [
                "inline-flex items-center justify-center rounded-vueda-control border py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive aria-invalid:focus-ring-shadow-destructive transition-colors overflow-hidden",
                {
                    "px-2": !numeric,
                    "font-mono tabular-nums min-w-5 px-1": numeric,
                    "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90":
                        !variant || variant === "default",
                    "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90":
                        variant === "secondary",
                    "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 focus-visible:outline-destructive dark:bg-destructive/60":
                        variant === "destructive",
                    "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground": variant === "outline",
                },
            ],
        }),
    },
    Kbd: {
        root: {
            class: [
                "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium select-none",
                "[&_svg:not([class*='size-'])]:size-3",
                "[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
            ],
        },
    },
    KbdGroup: {
        root: {
            class: "inline-flex items-center gap-1",
        },
    },

    // avatar
    Avatar: {
        root: {
            class: "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        },
    },
    AvatarImage: {
        root: {
            class: "aspect-square size-full",
        },
    },
    AvatarFallback: {
        root: {
            class: "bg-muted flex size-full items-center justify-center rounded-full",
        },
    },
    UserAvatar: {
        // Initials chip: tone selects color recipe. Size is driven by inline style on the
        // SFC root (width/height/font-size derived from the `size` prop), not the theme key.
        // - `primary` (default): primary-tinted bg + primary border + primary ink (PROP-156).
        // - `sidebar`: solid sidebar-accent bg + sidebar-foreground ink (PROP-100).
        root: ({ tone }) => ({
            class: [
                "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full select-none",
                {
                    "border border-primary bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary":
                        !tone || tone === "primary",
                    "bg-sidebar-accent text-sidebar-foreground": tone === "sidebar",
                },
            ],
        }),
        initials: {
            class: "font-semibold uppercase leading-none tabular-nums",
        },
    },
    // Destructive-action consequence list. 2-column grid (18 px icon · label/sub stack)
    // per row; per-row `data-tone` (default | warn | danger) tints only the leading icon
    // via the `toneWarn` / `toneDanger` keys so customization stays granular. Label is
    // 13 px / 600 / foreground; description is 11.5 px / 400 / muted-foreground. PROP-167.
    ConsequencesBullets: {
        root: {
            class: ["flex flex-col gap-2 m-0 p-0 list-none"],
        },
        item: {
            class: ["grid grid-cols-[18px_1fr] items-start gap-x-2.5"],
        },
        icon: {
            class: [
                "flex h-[18px] w-[18px] items-center justify-center mt-px",
                "text-[14px] leading-none text-muted-foreground",
            ],
        },
        text: {
            class: ["flex flex-col gap-0.5 min-w-0"],
        },
        label: {
            class: ["text-[13px] font-semibold leading-[1.35] text-foreground"],
        },
        description: {
            class: ["text-[11.5px] font-normal leading-[1.4] text-muted-foreground"],
        },
        toneWarn: {
            class: ["text-warning"],
        },
        toneDanger: {
            class: ["text-destructive"],
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
