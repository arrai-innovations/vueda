/**
 * @module theme/vueda-tailwind/navigation/NavigationMenuViewport.theme
 *
 * Per-component theme registration for NavigationMenuViewport. Imported as a side effect by
 * NavigationMenuViewport.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * NavigationMenuViewport styles the animated viewport that hosts navigation menu panels.
     */
    NavigationMenuViewport: {
        /** Absolute wrapper that positions the shared viewport below the trigger row. */
        wrapper: {
            class: "absolute top-full left-0 isolate z-50 flex justify-center",
        },
        /** Shared animated popover surface for navigation panels. See also: {@api theme-key:NavigationMenuContent.root}. */
        root: {
            class: [
                // Surface and color.
                "origin-top-center bg-popover text-popover-foreground",

                // Motion and animation.
                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90",

                // Layout and sizing.
                "relative mt-1.5 h-[var(--reka-navigation-menu-viewport-height)] w-full overflow-hidden",

                // Shape and responsive placement.
                "rounded-vueda-control border shadow-vueda-popover md:w-[var(--reka-navigation-menu-viewport-width)] left-[var(--reka-navigation-menu-viewport-left)]",
            ],
        },
    },
});
