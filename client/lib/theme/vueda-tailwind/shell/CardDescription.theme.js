/**
 * @module theme/vueda-tailwind/shell/CardDescription.theme
 *
 * Per-component theme registration for CardDescription. Imported as a side effect by
 * CardDescription.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * CardDescription styles secondary explanatory text inside a card header.
     */
    CardDescription: {
        /**
         * The secondary card header copy. It uses muted body text for explanatory text below {@api theme-key:CardTitle.root}.
         */
        root: {
            class: "text-muted-foreground text-body",
        },
    },
});
