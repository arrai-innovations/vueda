/**
 * @module theme/vueda-tailwind/feedback/Progress.theme
 *
 * Per-component theme registration for Progress. Imported as a side effect by
 * Progress.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire feedback family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
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
                "h-full w-full flex-1 transition-all",
                "data-[state=indeterminate]:w-2/5 data-[state=indeterminate]:animate-vueda-progress-slide",
                {
                    "bg-primary": !tone,
                    "bg-success": tone === "success",
                    "bg-warning": tone === "warning",
                    "bg-destructive": tone === "destructive",
                },
            ],
        }),
    },
});
