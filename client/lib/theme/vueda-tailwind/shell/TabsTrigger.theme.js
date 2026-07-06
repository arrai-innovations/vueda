/**
 * @module theme/vueda-tailwind/shell/TabsTrigger.theme
 *
 * Per-component theme registration for TabsTrigger. Imported as a side effect by
 * TabsTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * TabsTrigger styles each selectable tab in a tabs list.
     */
    TabsTrigger: {
        /**
         * The selectable tab segment. It handles active fill, dark-mode contrast, icon sizing, disabled state, and keyboard focus while staying within the segmented list surface.
         */
        root: {
            class: [
                // Active and color states.
                "data-[state=active]:bg-background dark:data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground",

                // Layout and spacing.
                "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5",

                // Shape and type.
                "rounded-vueda-control border-hairline border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap",

                // Focus and disabled states.
                "transition-colors focus-visible:focus-ring disabled:pointer-events-none disabled:opacity-50",

                // Icons.
                "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },
});
