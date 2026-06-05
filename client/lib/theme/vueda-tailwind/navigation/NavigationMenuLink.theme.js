/**
 * @module theme/vueda-tailwind/navigation/NavigationMenuLink.theme
 *
 * Per-component theme registration for NavigationMenuLink. Imported as a side effect by
 * NavigationMenuLink.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * NavigationMenuLink styles links rendered inside navigation menu content.
     */
    NavigationMenuLink: {
        /** Link row inside a navigation panel. Active uses `bg-accent/50` so hover remains the stronger cue. */
        root: {
            class: "data-active:focus:bg-accent data-active:hover:bg-accent data-active:bg-accent/50 data-active:text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground flex flex-col gap-1 rounded-sm p-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg:not([class*='size-'])]:size-4",
        },
    },
});
