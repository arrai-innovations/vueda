/**
 * @module theme/vueda-tailwind/shell/ItemContent.theme
 *
 * Per-component theme registration for ItemContent. Imported as a side effect by
 * ItemContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ItemContent stacks the main text content inside an item.
     */
    ItemContent: {
        /**
         * The main text stack inside an item. It flexes to fill available space and lets a following content block opt out of that growth.
         */
        root: {
            class: "flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none",
        },
    },
});
