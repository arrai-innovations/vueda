/**
 * @module theme/vueda-tailwind/navigation/NavigationMenu.theme
 *
 * Per-component theme registration for NavigationMenu. Imported as a side effect by
 * NavigationMenu.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * NavigationMenu provides the root container for a multi-level navigation menu.
     */
    NavigationMenu: {
        /** Root flex context that centers the navigation menu and scopes viewport mode selectors. */
        root: {
            class: "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        },
    },
});
