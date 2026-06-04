/**
 * @module theme/vueda-tailwind/feedback/AlertClose.theme
 *
 * Per-component theme registration for AlertClose. Imported as a side effect by
 * AlertClose.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire feedback family.
 *
 * Prototype-phase duplication: this entry mirrors the AlertClose slice of
 * feedback/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertClose positions a dismiss control inside an alert. It provides the compact focus and hover affordance used by closable alerts.
     */
    AlertClose: {
        /**
         * The positioned dismiss affordance for closable alerts. It stays visually quiet until hover or keyboard focus, then uses the shared ring color through the focus-visible outline.
         */
        root: {
            class: "absolute top-3 right-3 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        },
    },
});
