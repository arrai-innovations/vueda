/**
 * @module theme/vueda-tailwind/shell/CardAction.theme
 *
 * Per-component theme registration for CardAction. Imported as a side effect by
 * CardAction.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the CardAction slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * CardAction positions an action control alongside card header text.
     */
    CardAction: {
        /**
         * The trailing card header action region. It parks in the top-right column and spans the title and description rows without adding wrapper layout logic.
         */
        root: {
            class: "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        },
    },
});
