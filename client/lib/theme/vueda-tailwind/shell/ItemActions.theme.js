/**
 * @module theme/vueda-tailwind/shell/ItemActions.theme
 *
 * Per-component theme registration for ItemActions. Imported as a side effect by
 * ItemActions.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the ItemActions slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
