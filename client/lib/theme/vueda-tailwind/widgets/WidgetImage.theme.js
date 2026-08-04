/**
 * @module theme/vueda-tailwind/widgets/WidgetImage.theme
 *
 * Per-component theme registration for WidgetImage. Imported as a side effect by
 * WidgetImage.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Image widget for displaying and managing image-backed fields. Provides
     * the vertical wrapper and flexible image action row.
     */
    WidgetImage: {
        /** The root is transparent so image widgets inherit the surrounding field rhythm. */
        root: {
            class: [],
        },
        /** The inner column stacks image preview and image actions. */
        inner: {
            class: ["flex flex-col"],
        },
        /** The image row wraps preview details and actions without overflow. */
        image: {
            class: ["flex flex-wrap justify-between"],
        },
    },
});
