/**
 * @module theme/vueda-tailwind/shell/Accordion.theme
 *
 * Per-component theme registration for Accordion. Imported as a side effect by
 * Accordion.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the Accordion slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Accordion provides the theme hooks for vertically stacked disclosure sections.
     */
    Accordion: {
        /**
         * The root hook for the accordion wrapper. It intentionally ships without chrome so callers can compose accordion groups inside Card, Item, or plain page sections.
         */
        root: { class: "" },
    },
});
