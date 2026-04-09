/**
 * @module theme/vueda-tailwind/feedback
 * @description Tailwind CSS theme configuration for VUEDA Client feedback components.
 */
export default {
    FeedbackAlert: {
        root: ({ variant }) => ({
            class: [
                "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
                {
                    "bg-card text-card-foreground": !variant || variant === "default",
                    "border-destructive/50 text-destructive bg-destructive/10 *:data-[slot=alert-description]:text-destructive/90":
                        variant === "destructive",
                    "border-yellow-500/50 text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/30":
                        variant === "warning",
                    "border-blue-500/50 text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30":
                        variant === "info",
                    "border-green-500/50 text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/30":
                        variant === "success",
                },
            ],
        }),
    },
    FeedbackAlertClose: {
        root: {
            class: "absolute top-3 right-3 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden",
        },
    },
    FeedbackAlertTitle: {
        root: {
            class: "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        },
    },
    FeedbackAlertDescription: {
        root: {
            class: "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        },
    },
    FeedbackProgress: {
        root: {
            class: "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        },
        indicator: {
            class: "bg-primary h-full w-full flex-1 transition-all",
        },
    },
    FeedbackSkeleton: {
        root: {
            class: "animate-pulse rounded-md bg-primary/10",
        },
    },
    FeedbackSpinner: {
        root: {
            class: "size-4 animate-spin",
        },
    },
    FeedbackToaster: {
        root: {
            class: "toaster group",
        },
    },
};
