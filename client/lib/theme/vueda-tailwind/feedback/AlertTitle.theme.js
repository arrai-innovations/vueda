/**
 * @module theme/vueda-tailwind/feedback/AlertTitle.theme
 *
 * Per-component theme registration for AlertTitle. Imported as a side effect by
 * AlertTitle.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire feedback family.
 *
 * Prototype-phase duplication: this entry mirrors the AlertTitle slice of
 * feedback/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertTitle renders the primary alert heading. It aligns with alert content columns and clamps long titles to one line.
     */
    AlertTitle: {
        /**
         * The primary message heading inside the alert grid. It starts in the content column created by {@api theme-key:Alert.root} and clamps to one line so status banners do not grow from long labels.
         */
        root: {
            class: "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        },
    },
});
