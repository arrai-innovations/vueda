/**
 * @module theme/vueda-tailwind/shell/ItemTitle.theme
 *
 * Per-component theme registration for ItemTitle. Imported as a side effect by
 * ItemTitle.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ItemTitle styles the primary label inside an item.
     */
    ItemTitle: {
        /**
         * The primary label inside an item. It uses body-sized medium text and inline gap support for leading or trailing inline elements.
         */
        root: {
            class: "flex w-fit items-center gap-2 text-body leading-snug font-medium",
        },
    },
});
