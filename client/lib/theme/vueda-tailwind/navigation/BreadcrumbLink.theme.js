/**
 * @module theme/vueda-tailwind/navigation/BreadcrumbLink.theme
 *
 * Per-component theme registration for BreadcrumbLink. Imported as a side effect by
 * BreadcrumbLink.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * BreadcrumbLink styles navigable breadcrumb steps.
     */
    BreadcrumbLink: {
        /** Navigable trail step. Hover and focus move toward foreground without changing weight. */
        root: {
            class: [
                // Interactive states.
                "hover:text-foreground transition-colors",

                // Shape and focus.
                "rounded-vueda-control focus-visible:focus-ring",
            ],
        },
    },
});
