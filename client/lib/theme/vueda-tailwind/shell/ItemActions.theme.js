/**
 * @module theme/vueda-tailwind/shell/ItemActions.theme
 *
 * Per-component theme registration for ItemActions. Imported as a side effect by
 * ItemActions.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ItemActions arranges trailing controls for an item.
     */
    ItemActions: {
        /**
         * The trailing action group inside an item. It keeps adjacent controls aligned and evenly spaced without affecting the main content column.
         */
        root: {
            class: "flex items-center gap-2",
        },
    },
});
