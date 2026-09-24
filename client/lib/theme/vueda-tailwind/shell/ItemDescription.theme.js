/**
 * @module theme/vueda-tailwind/shell/ItemDescription.theme
 *
 * Per-component theme registration for ItemDescription. Imported as a side effect by
 * ItemDescription.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ItemDescription styles secondary text and links inside an item.
     */
    ItemDescription: {
        /**
         * The secondary item copy. It clamps to two lines, uses muted body text, and styles links as quiet inline affordances.
         */
        root: {
            class: [
                // Type and truncation.
                "text-muted-foreground line-clamp-2 text-body leading-normal font-normal text-balance",

                // Link states.
                "[&>a:hover]:text-primary-text [&>a]:underline [&>a]:underline-offset-4",
            ],
        },
    },
});
