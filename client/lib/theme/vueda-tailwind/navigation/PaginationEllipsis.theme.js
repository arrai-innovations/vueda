/**
 * @module theme/vueda-tailwind/navigation/PaginationEllipsis.theme
 *
 * Per-component theme registration for PaginationEllipsis. Imported as a side effect by
 * PaginationEllipsis.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * PaginationEllipsis represents omitted pages in a pagination control.
     */
    PaginationEllipsis: {
        /** Omitted-page marker sized to align with neighboring pagination controls. */
        root: {
            class: "flex size-9 items-center justify-center",
        },
    },
});
