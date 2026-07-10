/**
 * @module theme/vueda-tailwind/shell/AccordionItem.theme
 *
 * Per-component theme registration for AccordionItem. Imported as a side effect by
 * AccordionItem.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AccordionItem defines the bordered row wrapper for one disclosure section.
     */
    AccordionItem: {
        /**
         * The wrapper for one disclosure row. It paints the simple bottom divider and removes it from the final item, keeping accordion chrome owned by items rather than the root.
         */
        root: {
            class: "border-b-hairline last:border-b-0",
        },
    },
});
