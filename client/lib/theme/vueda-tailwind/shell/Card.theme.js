/**
 * @module theme/vueda-tailwind/shell/Card.theme
 *
 * Per-component theme registration for Card. Imported as a side effect by
 * Card.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Card styles the basic framed surface used for panels and contained content.
     */
    Card: {
        /**
         * The framed card surface. It owns the card background, border, radius, vertical rhythm, and non-raised shadow contract; padding on the horizontal axis belongs to child slots.
         */
        root: {
            class: [
                // Surface and color.
                "bg-card text-card-foreground",

                // Layout and spacing.
                "flex flex-col gap-6",

                // Shape and elevation.
                "rounded-vueda-card border py-6 shadow-vueda-card",
            ],
        },
    },
});
