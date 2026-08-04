/**
 * @module theme/vueda-tailwind/shell/CardTitle.theme
 *
 * Per-component theme registration for CardTitle. Imported as a side effect by
 * CardTitle.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * CardTitle styles the primary heading inside a card.
     */
    CardTitle: {
        /**
         * The primary title text inside a card header. It uses compact semibold type so card headings stay subordinate to page titles.
         */
        root: {
            class: "leading-none font-semibold",
        },
    },
});
