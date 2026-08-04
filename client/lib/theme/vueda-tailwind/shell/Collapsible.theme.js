/**
 * @module theme/vueda-tailwind/shell/Collapsible.theme
 *
 * Per-component theme registration for Collapsible. Imported as a side effect by
 * Collapsible.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
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
