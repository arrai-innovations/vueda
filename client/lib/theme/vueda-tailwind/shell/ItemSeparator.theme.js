/**
 * @module theme/vueda-tailwind/shell/ItemSeparator.theme
 *
 * Per-component theme registration for ItemSeparator. Imported as a side effect by
 * ItemSeparator.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ItemSeparator styles dividers between item rows.
     */
    ItemSeparator: {
        /**
         * The divider between item rows. It removes extra vertical margin so separators can be used in dense item groups.
         */
        root: {
            class: "my-0",
        },
    },
});
