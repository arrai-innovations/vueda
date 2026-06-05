/**
 * @module theme/vueda-tailwind/navigation/Breadcrumb.theme
 *
 * Per-component theme registration for Breadcrumb. Imported as a side effect by
 * Breadcrumb.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Breadcrumb provides the root context for a trail of hierarchical navigation links.
     */
    Breadcrumb: {
        /** Root context only. The trail's visible layout lives on {@api theme-key:BreadcrumbList.root}. */
        root: { class: "" },
    },
});
