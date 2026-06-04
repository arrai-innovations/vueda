/**
 * @module theme/vueda-tailwind/widgets/WidgetImage.theme
 *
 * Per-component theme registration for WidgetImage. Imported as a side effect by
 * WidgetImage.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
 *
 * Prototype-phase duplication: this entry mirrors the WidgetImage slice of
 * widgets/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
