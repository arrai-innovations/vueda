/**
 * @module theme/vueda-tailwind/shell/CardContent.theme
 *
 * Per-component theme registration for CardContent. Imported as a side effect by
 * CardContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * CardContent provides the default horizontal inset for card body content.
     */
    CardContent: {
        /**
         * The body content inset for a card. It provides the horizontal padding that Card itself omits so full-width header or footer borders can span cleanly.
         */
        root: {
            class: "px-6",
        },
    },
});
