/**
 * @module theme/vueda-tailwind/shell/DrawerFooter.theme
 *
 * Per-component theme registration for DrawerFooter. Imported as a side effect by
 * DrawerFooter.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the DrawerFooter slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DrawerFooter arranges trailing drawer actions.
     */
    DrawerFooter: {
        /**
         * The trailing action area inside a drawer. It pins itself after drawer body content and stacks actions with the standard 4px-grid gap.
         */
        root: {
            class: "mt-auto flex flex-col gap-2 p-4",
        },
    },
});
