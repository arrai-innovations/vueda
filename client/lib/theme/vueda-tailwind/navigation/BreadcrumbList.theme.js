/**
 * @module theme/vueda-tailwind/navigation/BreadcrumbList.theme
 *
 * Per-component theme registration for BreadcrumbList. Imported as a side effect by
 * BreadcrumbList.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * BreadcrumbList arranges breadcrumb items and separators in a wrapping inline row.
     */
    BreadcrumbList: {
        /** Inline wrapping row for breadcrumb items. */
        root: {
            class: "text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
        },
    },
});
