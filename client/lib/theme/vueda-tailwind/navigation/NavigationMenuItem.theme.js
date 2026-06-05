/**
 * @module theme/vueda-tailwind/navigation/NavigationMenuItem.theme
 *
 * Per-component theme registration for NavigationMenuItem. Imported as a side effect by
 * NavigationMenuItem.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * NavigationMenuItem wraps one top-level navigation menu entry.
     */
    NavigationMenuItem: {
        /** Positioning wrapper for one top-level navigation menu entry and its content. */
        root: {
            class: "relative",
        },
    },
});
