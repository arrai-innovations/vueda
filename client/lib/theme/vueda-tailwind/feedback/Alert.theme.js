/**
 * @module theme/vueda-tailwind/feedback/Alert.theme
 *
 * Per-component theme registration for Alert. Imported as a side effect by
 * Alert.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire feedback family.
 *
 * Prototype-phase duplication: this entry mirrors the Alert slice of
 * feedback/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
});
