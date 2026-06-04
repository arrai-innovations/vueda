/**
 * @module theme/vueda-tailwind/shell/Collapsible.theme
 *
 * Per-component theme registration for Collapsible. Imported as a side effect by
 * Collapsible.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the Collapsible slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Collapsible provides the root theme hook for a generic disclosure region.
     */
    Collapsible: {
        /**
         * The root hook for generic collapsible state. It intentionally has no visual recipe because Collapsible is a logic primitive.
         */
        root: { class: "" },
    },
});
