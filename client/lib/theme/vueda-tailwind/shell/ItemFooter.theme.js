/**
 * @module theme/vueda-tailwind/shell/ItemFooter.theme
 *
 * Per-component theme registration for ItemFooter. Imported as a side effect by
 * ItemFooter.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the ItemFooter slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ItemFooter styles low-emphasis footer metadata inside an item.
     */
    ItemFooter: {
        /**
         * The low-emphasis metadata row below item content. It uses compact mono supporting text so timestamps, counters, and machine-generated values read as metadata.
         */
        root: {
            class: "flex basis-full items-center justify-between gap-2 font-mono text-[length:var(--vueda-text-supporting)] text-muted-foreground",
        },
    },
});
