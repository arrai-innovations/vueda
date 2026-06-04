/**
 * @module theme/vueda-tailwind/shell/ItemGroup.theme
 *
 * Per-component theme registration for ItemGroup. Imported as a side effect by
 * ItemGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the ItemGroup slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
