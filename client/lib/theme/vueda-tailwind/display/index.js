/**
 * @module theme/vueda-tailwind/display
 * @description Tailwind CSS pass-through theme configuration for VUEDA Client display and read-only components.
 */

export default {
    // ---------- Media ----------
    /**
     * AspectRatio wraps content in a fixed-ratio layout box. It carries no default classes because sizing is supplied by the primitive and caller.
     */
    AspectRatio: {
        /** Empty pass-through wrapper for ratio-bound media; sizing comes from the primitive and caller. */
        root: { class: "" },
    },

    // ---------- Date and time ----------
    /**
     * DateRangeDisplay formats a start and end date with a stable separator. Its slots keep each date segment individually addressable.
     */
    DateRangeDisplay: {
        /** Inline date-range wrapper that prevents the paired dates and separator from wrapping apart. */
        root: {
            class: "whitespace-nowrap",
        },
        /** Separator text between {@api theme-key:DateRangeDisplay.from} and {@api theme-key:DateRangeDisplay.to}. */
        separator: {
            class: "",
        },
        /** Start-date text segment, kept addressable for range-specific typography or color. */
        from: {
            class: "",
        },
        /** End-date text segment, kept separate from the start date for caller overrides. */
        to: {
            class: "",
        },
    },
    /**
     * DateTimeDisplay presents absolute and relative time text together. It supports inline, stacked, tooltip, and fallback dash layouts.
     */
    DateTimeDisplay: {
        /** Inline time wrapper with baseline spacing for absolute and relative text. */
        root: {
            class: "flex items-center space-x-2",
        },
        /** Single-line layout for compact absolute plus relative date text. */
        inline: {
            class: "whitespace-nowrap",
        },
        /** Stacked layout map for absolute and relative lines when inline space is not available. */
        break: {
            absolute: "whitespace-nowrap",
            relative: "whitespace-nowrap mt-1",
        },
        /** Absolute timestamp segment; use for the precise value. */
        absolute: {
            class: "whitespace-nowrap",
        },
        /** Relative timestamp segment; use for the human-readable offset. */
        relative: {
            class: "whitespace-nowrap",
        },
        /** Help cursor for timestamp text that exposes the companion value in a tooltip. */
        tooltip: {
            class: "cursor-help",
        },
        /** Empty-value dash slot, intentionally unstyled so surrounding text rhythm wins. */
        dash: {
            class: "",
        },
    },

    // ---------- Text utilities ----------
    /**
     * ErrorDisplay renders error text and optional diagnostic code in a scroll-safe block. It keeps links and code content readable in narrow layouts.
     */
    ErrorDisplay: {
        /** Full-width error block wrapper for message, code, and links. */
        root: {
            class: "w-full",
        },
        /** Scroll-safe column container for long diagnostic text. */
        container: {
            class: "max-w-full overflow-x-auto p-1 2xs:p-2 2xl:p-4 flex flex-col gap-2",
        },
        /** Primary error message area; inherits typography from the surrounding surface. */
        message: {
            class: [],
        },
        /** Code block surface for stack traces or machine diagnostics. */
        codeBlock: {
            class: "bg-neutral-100 dark:bg-neutral-800 p-1 2xs:p-2 2xl:p-4 rounded", // Styling for the code block
        },
        /** Underlined recovery or detail link inside the error message. */
        link: {
            class: "underline",
        },
    },
    /**
     * ClickToCopyText lays out copyable text with its affordance on the same baseline. It is used for compact read-only values that can be copied.
     */
    ClickToCopyText: {
        /** Baseline row for a compact read-only value and its copy affordance. */
        root: {
            class: "flex flex-row items-baseline gap-1 p-1 2xs:p-2 2xl:p-4 ",
        },
    },

    // ---------- Badges and keyboard hints ----------
    /**
     * Badge renders compact status, category, or count labels. Variants provide semantic fills while the numeric mode switches to tabular mono sizing.
     */
    Badge: {
        /** Compact slab badge with variant and numeric recipes. */
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
    /**
     * Kbd renders a single keyboard key hint. It keeps key labels compact and adjusts contrast when shown inside tooltip content.
     */
    Kbd: {
        /** Single keycap chip for shortcut hints; tooltip nesting adjusts contrast. */
        root: {
            class: [
                "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium select-none",
                "[&_svg:not([class*='size-'])]:size-3",
                "[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
            ],
        },
    },
    /**
     * KbdGroup aligns multiple keyboard key hints as one shortcut sequence. It spaces adjacent key chips without adding its own visual chrome.
     */
    KbdGroup: {
        /** Inline shortcut sequence wrapper that spaces adjacent {@api theme-key:Kbd.root} chips. */
        root: {
            class: "inline-flex items-center gap-1",
        },
    },

    // ---------- Avatars ----------
    /**
     * Avatar provides the circular media frame used by image and fallback avatar parts. It clips child content to the avatar shape.
     */
    Avatar: {
        /** Circular clipping frame shared by avatar image and fallback content. */
        root: {
            class: "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        },
    },
    /**
     * AvatarImage fills the avatar frame with an image. It preserves a square media box inside the rounded container.
     */
    AvatarImage: {
        /** Square image fill that inherits clipping from {@api theme-key:Avatar.root}. */
        root: {
            class: "aspect-square size-full",
        },
    },
    /**
     * AvatarFallback centers fallback content when an avatar image is unavailable. It uses the muted surface treatment for neutral identity placeholders.
     */
    AvatarFallback: {
        /** Centered muted fallback surface for initials or placeholder content. */
        root: {
            class: "bg-muted flex size-full items-center justify-center rounded-full",
        },
    },
    /**
     * UserAvatar renders initials with selectable tone recipes for user identity displays. The component controls physical size while the theme key owns color and typography.
     */
    UserAvatar: {
        /**
         * Initials chip frame. The component supplies size inline from its size prop, while tone selects the primary or sidebar color recipe.
         */
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
        /** Uppercase initials text with stable numeric glyphs. */
        initials: {
            class: "font-semibold uppercase leading-none tabular-nums",
        },
    },

    // ---------- System messages ----------
    /**
     * ConsequencesBullets renders a compact list of consequences for destructive or risky actions. Per-row tone attributes tint the leading icon while keeping labels and descriptions consistent.
     */
    ConsequencesBullets: {
        /** List wrapper for consequence rows with no browser list chrome. */
        root: {
            class: ["flex flex-col gap-2 m-0 p-0 list-none"],
        },
        /** Two-column row that keeps the icon column aligned even when the icon is empty. */
        item: {
            class: ["grid grid-cols-[18px_1fr] items-start gap-x-2.5"],
        },
        /** Fixed icon cell tinted by row tone via {@api theme-key:ConsequencesBullets.toneWarn} or {@api theme-key:ConsequencesBullets.toneDanger}. */
        icon: {
            class: [
                "flex h-[18px] w-[18px] items-center justify-center mt-px",
                "text-[14px] leading-none text-muted-foreground",
            ],
        },
        /** Label and optional description stack for one consequence. */
        text: {
            class: ["flex flex-col gap-0.5 min-w-0"],
        },
        /** Foreground consequence title in the body text role. */
        label: {
            class: ["text-[13px] font-semibold leading-[1.35] text-foreground"],
        },
        /** Supporting consequence detail text below the label. */
        description: {
            class: ["text-[11.5px] font-normal leading-[1.4] text-muted-foreground"],
        },
        /** Warning tone applied to the row icon for cautionary consequences. */
        toneWarn: {
            class: ["text-warning"],
        },
        /** Destructive tone applied to the row icon for irreversible consequences. */
        toneDanger: {
            class: ["text-destructive"],
        },
    },
    /**
     * SystemMessageCard provides the centered card chassis for system-level states such as not found, loading, and deactivate screens. Its named group scope routes tone-specific crest styling from the root.
     */
    SystemMessageCard: {
        /** Centered card chassis with the named tone group used by crest descendants. */
        root: {
            class: [
                "group/system-message-card",
                "max-w-[460px] w-full",
                "flex flex-col gap-5",
                "rounded-vueda-card border border-border bg-card",
                "px-8 pt-8 pb-7",
                "shadow-[0_1px_0_0_color-mix(in_oklab,var(--foreground)_4%,transparent)]",
            ],
        },
        /** Header row containing the icon tile, meta column, and optional status code, separated from the body by a bottom rule. */
        crest: {
            class: ["flex items-start gap-3 pb-4 border-b border-border"],
        },
        /** Tone-tinted icon tile routed through the system-message group scope. */
        crestIcon: {
            class: [
                "flex items-center justify-center shrink-0",
                "w-9 h-9 rounded-[4px]",
                "text-[18px] leading-none",
                // info + loading: primary blue soft tint
                "group-data-[tone=info]/system-message-card:bg-primary/[0.12] group-data-[tone=info]/system-message-card:text-primary",
                "group-data-[tone=loading]/system-message-card:bg-primary/[0.12] group-data-[tone=loading]/system-message-card:text-primary",
                // warning: amber soft tint
                "group-data-[tone=warning]/system-message-card:bg-warning/[0.14] group-data-[tone=warning]/system-message-card:text-warning",
                // danger: red soft tint
                "group-data-[tone=danger]/system-message-card:bg-destructive/[0.12] group-data-[tone=danger]/system-message-card:text-destructive",
            ],
        },
        /** Meta text column inside the crest, flexing between icon and optional code. */
        crestMeta: {
            class: ["flex flex-col justify-center gap-0.5 min-w-0 flex-1"],
        },
        /** Uppercase eyebrow for the system-message category. */
        crestEyebrow: {
            class: ["text-[10px] font-semibold uppercase tracking-[0.06em]", "text-muted-foreground leading-none"],
        },
        /** Mono line for a machine-readable path, action kind, or route label. */
        crestKind: {
            class: ["font-mono text-[12px] font-medium leading-[1.3] text-foreground"],
        },
        /** Optional trailing status code, rendered as an oversized mono numeral. */
        crestCode: {
            class: [
                "font-mono text-[36px] font-semibold leading-none tabular-nums",
                "text-foreground/50 shrink-0 self-center",
            ],
        },
        /** Body stack for explanatory copy, diagnostics, and embedded display primitives. */
        body: {
            class: ["flex flex-col gap-3"],
        },
        /** Optional action row below the body content. */
        actions: {
            class: ["flex items-center gap-2"],
        },
    },
    /**
     * LoadingHeartbeatStrip displays request identity, elapsed time, dependency count, and heartbeat status in one mono row. It separates the default and slow-path dots so loading state tone remains customizable.
     */
    LoadingHeartbeatStrip: {
        /** Mono status row that separates request identity from live loading state. */
        root: {
            class: [
                "flex items-center justify-between gap-4",
                "font-mono text-[11px] leading-none text-muted-foreground",
            ],
        },
        /** Truncated request identifier group on the leading side of the strip. */
        id: {
            class: ["flex items-center gap-1.5 min-w-0 shrink truncate"],
        },
        /** Trailing status group for dependency count and heartbeat dot. */
        status: {
            class: ["flex items-center gap-1.5 shrink-0"],
        },
        /** Default heartbeat dot using the primary loading tint. */
        dot: {
            class: ["inline-block w-1.5 h-1.5 rounded-full bg-primary text-primary", "animate-vueda-heartbeat-pulse"],
        },
        /** Slow-path heartbeat dot using the warning tint. */
        dotSlow: {
            class: ["inline-block w-1.5 h-1.5 rounded-full bg-warning text-warning", "animate-vueda-heartbeat-pulse"],
        },
    },
    /**
     * LoadingSkeletonGhost renders a bordered placeholder card with variable-width skeleton bars. It owns the shimmer treatment for system loading previews without changing the shared Skeleton recipe.
     */
    LoadingSkeletonGhost: {
        /** Bordered placeholder card with the shimmer overlay owned by this loading preview. */
        root: {
            class: [
                "relative overflow-hidden",
                "rounded-vueda-card border border-border bg-background",
                "flex flex-col gap-3 p-4",
                "before:content-[''] before:absolute before:inset-0 before:pointer-events-none",
                "before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.04] before:to-transparent",
                "before:translate-x-[-100%] before:animate-vueda-skeleton-shimmer",
            ],
        },
        /** Individual skeleton bar height; each bar receives its width from component inline style. */
        bar: {
            class: ["h-[10px]"],
        },
    },
    /**
     * DiagnosticStrip renders compact key-value diagnostics in a bordered two-column grid. The component may add mono treatment to values while the theme key owns the shared strip structure.
     */
    DiagnosticStrip: {
        /** Compact diagnostic definition-list grid for request, route, or session values. */
        root: {
            class: [
                "grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1",
                "rounded-vueda-card border border-border bg-muted/35",
                "px-3 py-2",
            ],
        },
        /** Uppercase diagnostic label cell. */
        dt: {
            class: ["text-[10px] font-semibold uppercase tracking-[0.06em]", "text-muted-foreground leading-none"],
        },
        /** Diagnostic value cell; the component adds mono treatment when requested. */
        dd: {
            class: ["text-[11px] font-normal text-foreground leading-none m-0"],
        },
    },
    /**
     * SuggestionList renders typed "Did you mean?" choices for system 404 views. It combines an optional heading row with bordered suggestion rows and shape-specific trailing chips.
     */
    SuggestionList: {
        /** Outer suggestion stack; border treatment lives on {@api theme-key:SuggestionList.list}. */
        root: {
            class: ["flex flex-col gap-2"],
        },
        /** Header row aligning the human label with the optional machine source. */
        headRow: {
            class: ["flex items-baseline justify-between gap-3"],
        },
        /** Uppercase suggestion heading. */
        head: {
            class: ["text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground leading-none"],
        },
        /** Mono source label for the matching system that produced the suggestions. */
        source: {
            class: ["font-mono text-[10px] text-muted-foreground leading-none"],
        },
        /** Bordered list container with divided suggestion rows. */
        list: {
            class: ["rounded-vueda-card border border-border overflow-hidden divide-y divide-border list-none m-0 p-0"],
        },
        /** Full-width router-link row laid out as icon, text stack, chip, and chevron. */
        item: {
            class: [
                "grid grid-cols-[24px_1fr_auto_auto] items-center gap-x-3 px-2.5 py-2.5",
                "w-full no-underline text-inherit",
                "hover:bg-muted/50 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            ],
        },
        /** Leading icon cell for the suggestion type. */
        icon: {
            class: ["flex items-center justify-center w-6 h-6 shrink-0 text-muted-foreground text-[16px] leading-none"],
        },
        /** Text column stacking label above the route path or action description. */
        labelStack: {
            class: ["flex flex-col gap-0.5 min-w-0"],
        },
        /** Primary suggestion label in foreground text. */
        label: {
            class: ["text-[13px] font-medium text-foreground leading-[1.3] truncate"],
        },
        /** Secondary suggestion text, usually a mono route path or action description. */
        sub: {
            class: ["font-mono text-[12px] font-normal text-muted-foreground leading-[1.3] truncate"],
        },
        /** Route-match score chip with mono numeric text. */
        score: {
            class: [
                "font-mono text-[10px] uppercase leading-none",
                "border border-border rounded-sm bg-muted text-muted-foreground",
                "px-1.5 py-0.5 shrink-0",
            ],
        },
        /** HTTP verb chip for action suggestions, matching {@api theme-key:SuggestionList.score}. */
        verb: {
            class: [
                "font-mono text-[10px] uppercase leading-none",
                "border border-border rounded-sm bg-muted text-muted-foreground",
                "px-1.5 py-0.5 shrink-0",
            ],
        },
        /** Trailing chevron affordance for rows that navigate. */
        chevron: {
            class: ["flex items-center justify-center shrink-0 text-muted-foreground/60 text-[14px] leading-none"],
        },
    },
    /**
     * TriedUrlCallout renders the attempted URL as a compact system callout. It separates the label, value, and faded non-error path segments so the bad segment can stand out.
     */
    TriedUrlCallout: {
        /** Two-column callout wrapper for the attempted URL. */
        root: {
            class: [
                "grid grid-cols-[88px_1fr] items-center gap-x-2",
                "rounded-vueda-card border border-border",
                "px-3 py-2",
                "overflow-hidden",
            ],
        },
        /** Uppercase label column for the attempted URL. */
        label: {
            class: [
                "text-[10px] font-semibold uppercase tracking-[0.06em]",
                "text-muted-foreground leading-none shrink-0",
            ],
        },
        /** Mono value column for URL segments; individual spans own their signal color. */
        value: {
            class: ["font-mono text-[12.5px] font-normal leading-none min-w-0 truncate"],
        },
        /** Muted treatment for non-error URL segments so the bad segment remains the signal. */
        fade: {
            class: ["text-muted-foreground"],
        },
    },

    // ---------- Sorting ----------
    /**
     * MobileSortComponent lays out mobile sorting controls inside a drawer workflow. It covers drag handles, order text, select controls, and action bars for reorderable sort fields.
     */
    MobileSortComponent: {
        /** Drawer height override for the mobile sorting workflow. */
        drawer: {
            class: ["!h-auto"],
        },
        /** Inner drawer stack for draggable fields and actions. */
        drawerInner: {
            class: ["flex flex-col gap-4"],
        },
        /** Vertical list wrapper for reorderable sort fields. */
        draggable: {
            class: ["flex flex-col gap-2"],
        },
        /** Bordered sort-field row containing the handle, order text, and select. */
        draggableItem: {
            class: ["flex flex-row rounded-lg border border-neutral-200 p-3"],
        },
        /** Flexible row content inside each draggable item. */
        draggableItemInner: {
            class: ["select-none flex flex-row gap-3 items-center justify-between grow flex-1"],
        },
        /** Pointer target for dragging a sort field. */
        dragHandle: {
            class: ["drag-handle cursor-grab active:cursor-grabbing p-1"],
        },
        /** Small fixed-width sort-order label for the current field position. */
        sortOrderText: {
            class: ["w-3 text-sm font-semibold text-neutral-500"],
        },
        /** Full-width select control used to choose the sorted field. */
        select: {
            class: ["w-full"],
        },
        /** Inline action alignment for per-sort-field controls. */
        sortInlineActionBar: {
            class: ["flex flex-row content-baseline justify-end"],
        },
        /** Mobile drawer action stack for apply, clear, or cancel commands. */
        actionBar: {
            class: ["flex flex-col gap-2"],
        },
    },
};
