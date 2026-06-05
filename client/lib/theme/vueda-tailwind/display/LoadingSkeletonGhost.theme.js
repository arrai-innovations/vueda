/**
 * @module theme/vueda-tailwind/display/LoadingSkeletonGhost.theme
 *
 * Per-component theme registration for LoadingSkeletonGhost. Imported as a side effect by
 * LoadingSkeletonGhost.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
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
});
