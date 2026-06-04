/**
 * @module theme/vueda-tailwind/shell/ItemTitle.theme
 *
 * Per-component theme registration for ItemTitle. Imported as a side effect by
 * ItemTitle.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the ItemTitle slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
