/**
 * @module theme/vueda-tailwind/shell/DrawerHeader.theme
 *
 * Per-component theme registration for DrawerHeader. Imported as a side effect by
 * DrawerHeader.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DrawerHeader groups drawer title and description content.
     */
    DrawerHeader: {
        /**
         * The title and description stack inside a drawer. It applies the drawer's default 16px inset and compact vertical gap.
         */
        root: {
            class: "flex flex-col gap-1.5 p-4",
        },
    },
});
