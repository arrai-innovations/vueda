/**
 * @module theme/vueda-tailwind/feedback/Alert.theme
 *
 * Per-component theme registration for Alert. Imported as a side effect by
 * Alert.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire feedback family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Alert renders a contextual message container with optional icon content and semantic tone variants. It provides the grid structure that positions title, description, and actions together.
     */
    Alert: {
        /**
         * The outer alert surface and layout grid. It owns the optional icon column, card radius, and semantic status recipe, with variant colors flowing into {@api theme-key:AlertDescription.root}.
         */
        root: ({ variant }) => ({
            class: [
                // Layout and spacing.
                "relative w-full",
                // Edge is a `hairline` (inset box-shadow), not a `border`: the status
                // variants paint a saturated /50 edge, which a real 1px border renders
                // with chromatic fringing at integer DPR (see base.css § DPR-aware
                // hairline). Each variant recolours it via --vueda-hairline-color.
                "rounded-vueda-card hairline px-4 py-3 text-sm",
                "grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr]",
                "has-[>svg]:gap-x-3 gap-y-0.5 items-start",

                // Icon placement.
                "[&>svg]:size-4 [&>svg]:row-span-2 [&>svg]:translate-y-0.5 [&>svg]:text-current",
                {
                    "bg-card text-card-foreground hairline-border": !variant || variant === "default",
                    "[--vueda-hairline-color:color-mix(in_oklab,var(--destructive)_50%,transparent)] text-destructive bg-destructive/10 *:data-[slot=alert-description]:text-destructive/90":
                        variant === "destructive",
                    "[--vueda-hairline-color:color-mix(in_oklab,var(--warning)_50%,transparent)] text-warning bg-warning/10 *:data-[slot=alert-description]:text-warning/90":
                        variant === "warning",
                    "[--vueda-hairline-color:color-mix(in_oklab,var(--info)_50%,transparent)] text-info bg-info/10 *:data-[slot=alert-description]:text-info/90":
                        variant === "info",
                    "[--vueda-hairline-color:color-mix(in_oklab,var(--success)_50%,transparent)] text-success bg-success/10 *:data-[slot=alert-description]:text-success/90":
                        variant === "success",
                },
            ],
        }),
    },
});
