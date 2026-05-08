/**
 * @module theme/vueda-tailwind/feedback
 * @description Tailwind CSS theme configuration for VUEDA Client feedback components.
 */
export default {
    Alert: {
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
    AlertClose: {
        root: {
            class: "absolute top-3 right-3 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        },
    },
    AlertTitle: {
        root: {
            class: "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        },
    },
    AlertDescription: {
        root: {
            class: "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        },
    },
    AlertActions: {
        root: {
            class: "col-start-2 mt-2 inline-flex gap-2",
        },
    },
    Progress: {
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
    Skeleton: {
        root: {
            class: "animate-pulse rounded-md bg-primary/10",
        },
    },
    Sonner: {
        root: {
            class: "toaster group",
        },
    },
};
