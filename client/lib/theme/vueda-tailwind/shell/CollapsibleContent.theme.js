/**
 * @module theme/vueda-tailwind/shell/CollapsibleContent.theme
 *
 * Per-component theme registration for CollapsibleContent. Imported as a side effect by
 * CollapsibleContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * CollapsibleContent styles the region controlled by a collapsible trigger.
     */
    CollapsibleContent: {
        /**
         * The region controlled by a CollapsibleTrigger. It ships empty so feature surfaces can decide whether the content behaves like inline reveal, row detail, or raw-debug disclosure.
         */
        root: { class: "" },
    },
});
