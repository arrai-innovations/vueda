/**
 * @module theme/vueda-tailwind/shell/ItemGroup.theme
 *
 * Per-component theme registration for ItemGroup. Imported as a side effect by
 * ItemGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ItemGroup stacks related item rows.
     */
    ItemGroup: {
        /**
         * The stack wrapper for related items. It opens a named group scope and leaves borders or section chrome to the caller.
         */
        root: {
            class: "group/item-group flex flex-col",
        },
    },
});
