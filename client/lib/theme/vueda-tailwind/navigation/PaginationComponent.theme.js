/**
 * @module theme/vueda-tailwind/navigation/PaginationComponent.theme
 *
 * Per-component theme registration for PaginationComponent. Imported as a side effect by
 * PaginationComponent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * PaginationComponent styles the composed pagination widget used by higher-level data views.
     */
    PaginationComponent: {
        /** Responsive wrapper for the composed pagination widget used by higher-level views. */
        root: {
            class: "flex flex-col sm:flex-row justify-between sm:justify-between items-center gap-2",
        },
        /** Centered pagination control region within the composed widget. */
        paginator: {
            class: ["py-2 flex-1 flex justify-center"],
        },
        /** Tabular page-report text for stable numeric alignment. */
        pageReport: {
            class: ["text-sm tabular-nums"],
        },
        /** Padding wrapper for total-records copy when the composed widget renders it separately. */
        totalRecords: {
            class: ["p-2"],
        },
    },
});
