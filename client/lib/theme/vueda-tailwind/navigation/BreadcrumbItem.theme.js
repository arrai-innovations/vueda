/**
 * @module theme/vueda-tailwind/navigation/BreadcrumbItem.theme
 *
 * Per-component theme registration for BreadcrumbItem. Imported as a side effect by
 * BreadcrumbItem.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * BreadcrumbItem wraps one step in a breadcrumb trail.
     */
    BreadcrumbItem: {
        /** One breadcrumb step plus its separator affordance, sized as an inline cluster. */
        root: {
            class: "inline-flex items-center gap-1.5",
        },
    },
});
