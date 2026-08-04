/**
 * @module theme/vueda-tailwind/navigation/BreadcrumbPage.theme
 *
 * Per-component theme registration for BreadcrumbPage. Imported as a side effect by
 * BreadcrumbPage.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * BreadcrumbPage marks the current page in a breadcrumb trail.
     */
    BreadcrumbPage: {
        /** Current-page trail step. Uses foreground colour, not heavier type, so the trail still reads as one line. */
        root: {
            class: "text-foreground font-normal",
        },
    },
});
