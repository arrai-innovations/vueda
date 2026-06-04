/**
 * @module theme/vueda-tailwind/shell/CollapsibleTrigger.theme
 *
 * Per-component theme registration for CollapsibleTrigger. Imported as a side effect by
 * CollapsibleTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the CollapsibleTrigger slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * CollapsibleTrigger styles the control that toggles a collapsible region.
     */
    CollapsibleTrigger: {
        /**
         * The trigger hook for a generic collapsible. It ships empty so callers can use links, rows, buttons, or custom controls without inheriting accordion chrome.
         */
        root: { class: "" },
    },
});
