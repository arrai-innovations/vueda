/**
 * @module theme/vueda-tailwind/navigation/NavigationMenuContent.theme
 *
 * Per-component theme registration for NavigationMenuContent. Imported as a side effect by
 * NavigationMenuContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * NavigationMenuContent styles the panel that appears under an open navigation menu item.
     */
    NavigationMenuContent: {
        /** Panel content area with motion-aware slide transitions. When the viewport is disabled, this slot becomes its own popover surface. */
        root: {
            class: [
                // Motion and animation.
                "data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out",

                // Directional motion.
                "data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52",

                // Layout and spacing.
                "top-0 left-0 w-full p-2 pr-2.5 md:absolute md:w-auto",

                // Viewport-disabled surface.
                "group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground",

                // Viewport-disabled motion.
                "group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-in group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-out group-data-[viewport=false]/navigation-menu:data-[state=closed]:zoom-out-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:zoom-in-95",
                "group-data-[viewport=false]/navigation-menu:data-[state=open]:fade-in-0 group-data-[viewport=false]/navigation-menu:data-[state=closed]:fade-out-0",

                // Viewport-disabled shape and placement.
                "group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden",
                "group-data-[viewport=false]/navigation-menu:rounded-md group-data-[viewport=false]/navigation-menu:border group-data-[viewport=false]/navigation-menu:shadow group-data-[viewport=false]/navigation-menu:duration-200",
            ],
        },
    },
});
