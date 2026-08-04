/**
 * @module theme/vueda-tailwind/shell/CollapsibleTrigger.theme
 *
 * Per-component theme registration for CollapsibleTrigger. Imported as a side effect by
 * CollapsibleTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
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
