/**
 * @module theme/vueda-tailwind/navigation/BreadcrumbSeparator.theme
 *
 * Per-component theme registration for BreadcrumbSeparator. Imported as a side effect by
 * BreadcrumbSeparator.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * BreadcrumbSeparator renders the divider between breadcrumb steps.
     */
    BreadcrumbSeparator: {
        /** Separator glyph sizing. Default markup supplies a slash, while custom children can supply another glyph. */
        root: {
            class: "[&>svg]:size-3.5",
        },
    },
});
