/**
 * @module theme/vueda-tailwind/feedback/AlertActions.theme
 *
 * Per-component theme registration for AlertActions. Imported as a side effect by
 * AlertActions.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire feedback family.
 *
 * Prototype-phase duplication: this entry mirrors the AlertActions slice of
 * feedback/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AlertActions lays out follow-up controls inside an alert. It keeps alert actions aligned with the message body.
     */
    AlertActions: {
        /**
         * The inline action row for alert follow-up controls. It shares the alert content column with {@api theme-key:AlertTitle.root} and {@api theme-key:AlertDescription.root}, so buttons align under the message instead of under the icon.
         */
        root: {
            class: "col-start-2 mt-2 inline-flex gap-2",
        },
    },
});
