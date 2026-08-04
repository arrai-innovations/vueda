/**
 * @module theme/vueda-tailwind/shell/Accordion.theme
 *
 * Per-component theme registration for Accordion. Imported as a side effect by
 * Accordion.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Accordion provides the theme hooks for vertically stacked disclosure sections.
     */
    Accordion: {
        /**
         * The root hook for the accordion wrapper. It intentionally ships without chrome so callers can compose accordion groups inside Card, Item, or plain page sections.
         */
        root: { class: "" },
    },
});
