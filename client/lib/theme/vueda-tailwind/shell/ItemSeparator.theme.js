/**
 * @module theme/vueda-tailwind/shell/ItemSeparator.theme
 *
 * Per-component theme registration for ItemSeparator. Imported as a side effect by
 * ItemSeparator.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the ItemSeparator slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
