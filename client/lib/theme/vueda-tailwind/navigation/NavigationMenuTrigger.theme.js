/**
 * @module theme/vueda-tailwind/navigation/NavigationMenuTrigger.theme
 *
 * Per-component theme registration for NavigationMenuTrigger. Imported as a side effect by
 * NavigationMenuTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * NavigationMenuTrigger styles an item that opens navigation menu content.
     */
    NavigationMenuTrigger: {
        /** Header-scale trigger. It intentionally uses a 36px height and half-strength active fill. */
        root: {
            class: "group inline-flex h-9 w-max items-center justify-center rounded-vueda-control bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=open]:hover:bg-accent data-[state=open]:text-accent-foreground data-[state=open]:focus:bg-accent data-[state=open]:bg-accent/50 transition-colors focus-visible:focus-ring",
        },
    },
});
