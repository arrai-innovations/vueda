/**
 * @module theme/vueda-tailwind/shell/CardTitle.theme
 *
 * Per-component theme registration for CardTitle. Imported as a side effect by
 * CardTitle.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the CardTitle slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * CardTitle styles the primary heading inside a card.
     */
    CardTitle: {
        /**
         * The primary title text inside a card header. It uses compact semibold type so card headings stay subordinate to page titles.
         */
        root: {
            class: "leading-none font-semibold",
        },
    },
});
