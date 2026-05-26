/**
 * @module theme/vueda-tailwind/feedback
 * @description Tailwind CSS theme configuration for VUEDA Client feedback components.
 */
export default {
    // ---------- Alerts ----------
    /**
     * Alert renders a contextual message container with optional icon content and semantic tone variants. It provides the grid structure that positions title, description, and actions together.
     */
    Alert: {
        /**
         * The outer alert surface and layout grid. It owns the optional icon column, card radius, and semantic status recipe, with variant colors flowing into {@api theme-key:AlertDescription.root}.
         */
        root: ({ variant }) => ({
            class: [
                "relative w-full rounded-vueda-card border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:row-span-2 [&>svg]:translate-y-0.5 [&>svg]:text-current",
                {
                    "bg-card text-card-foreground": !variant || variant === "default",
                    "border-destructive/50 text-destructive bg-destructive/10 *:data-[slot=alert-description]:text-destructive/90":
                        variant === "destructive",
                    "border-warning/50 text-warning bg-warning/10 *:data-[slot=alert-description]:text-warning/90":
                        variant === "warning",
                    "border-info/50 text-info bg-info/10 *:data-[slot=alert-description]:text-info/90":
                        variant === "info",
                    "border-success/50 text-success bg-success/10 *:data-[slot=alert-description]:text-success/90":
                        variant === "success",
                },
            ],
        }),
    },
    /**
     * AlertClose positions a dismiss control inside an alert. It provides the compact focus and hover affordance used by closable alerts.
     */
    AlertClose: {
        /**
         * The positioned dismiss affordance for closable alerts. It stays visually quiet until hover or keyboard focus, then uses the shared ring color through the focus-visible outline.
         */
        root: {
            class: "absolute top-3 right-3 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        },
    },
    /**
     * AlertTitle renders the primary alert heading. It aligns with alert content columns and clamps long titles to one line.
     */
    AlertTitle: {
        /**
         * The primary message heading inside the alert grid. It starts in the content column created by {@api theme-key:Alert.root} and clamps to one line so status banners do not grow from long labels.
         */
        root: {
            class: "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        },
    },
    /**
     * AlertDescription renders supporting alert copy. It aligns with the alert title and keeps nested paragraph text readable.
     */
    AlertDescription: {
        /**
         * The supporting message copy beneath the alert title. It inherits variant-specific description tint from {@api theme-key:Alert.root} while keeping nested paragraphs readable for short remediation text.
         */
        root: {
            class: "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        },
    },
    /**
     * AlertActions lays out follow-up controls inside an alert. It keeps alert actions aligned with the message body.
     */
    AlertActions: {
        /**
         * The inline action row for alert follow-up controls. It shares the alert content column with {@api theme-key:AlertTitle.root} and {@api theme-key:AlertDescription.root}, so buttons align under the message instead of under the icon.
         */
        root: {
            class: "col-start-2 mt-2 inline-flex gap-2",
        },
    },

    // ---------- Progress and loading ----------
    /**
     * Progress renders a determinate or indeterminate progress track. Size and tone options adjust the track height and semantic fill treatment.
     */
    Progress: {
        /**
         * The progress track surface and clipping frame. It sets the canonical 8px default height, optional compact or large heights, and status track tints.
         */
        root: ({ size, tone }) => ({
            class: [
                "relative w-full overflow-hidden rounded-full",
                {
                    "h-1": size === "sm",
                    "h-2": !size || size === "md",
                    "h-3": size === "lg",
                    "bg-primary/20": !tone,
                    "bg-success/20": tone === "success",
                    "bg-warning/20": tone === "warning",
                    "bg-destructive/20": tone === "destructive",
                },
            ],
        }),
        /**
         * The moving progress fill. Determinate values are translated by the component inline style, while indeterminate progress narrows the fill and uses the `--animate-vueda-progress-slide` animation.
         */
        indicator: ({ tone }) => ({
            class: [
                "h-full w-full flex-1 transition-all data-[state=indeterminate]:w-2/5 data-[state=indeterminate]:animate-vueda-progress-slide",
                {
                    "bg-primary": !tone,
                    "bg-success": tone === "success",
                    "bg-warning": tone === "warning",
                    "bg-destructive": tone === "destructive",
                },
            ],
        }),
    },
    /**
     * Skeleton renders a neutral loading placeholder. It uses a pulsing muted primary tint for inline and block loading states.
     */
    Skeleton: {
        /**
         * The loading placeholder block. The primary tint stays neutral enough for rows, cards, and inline placeholders.
         */
        root: {
            class: "animate-pulse rounded-md bg-primary/10",
        },
    },

    // ---------- Toasts ----------
    /**
     * Sonner provides the theme hook for the toast viewport integration. The root class establishes the toaster group consumed by the Sonner library.
     */
    Sonner: {
        /**
         * The toast viewport theme hook passed to vue-sonner. It establishes the toaster group while toast surface, type tint, and icon resolution stay controlled by the wrapper component and Sonner rules.
         */
        root: {
            class: "toaster group",
        },
    },
};
