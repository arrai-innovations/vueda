/**
 * @module theme/vueda-tailwind/shell/ItemContent.theme
 *
 * Per-component theme registration for ItemContent. Imported as a side effect by
 * ItemContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the ItemContent slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
