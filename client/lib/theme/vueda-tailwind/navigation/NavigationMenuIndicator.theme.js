/**
 * @module theme/vueda-tailwind/navigation/NavigationMenuIndicator.theme
 *
 * Per-component theme registration for NavigationMenuIndicator. Imported as a side effect by
 * NavigationMenuIndicator.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * NavigationMenuIndicator renders the pointer that connects a trigger to its open panel.
     */
    NavigationMenuIndicator: {
        /** Animated indicator container that lines up the arrow between the trigger and open panel. */
        root: {
            class: "data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden",
        },
        /** Rotated popover-colored arrow for navigation-menu content. */
        arrow: {
            class: "bg-popover border-l border-t border-border relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm",
        },
    },
});
