/**
 * @module theme/vueda-tailwind/navigation/Pagination.theme
 *
 * Per-component theme registration for Pagination. Imported as a side effect by
 * Pagination.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Pagination provides the root layout for pagination controls.
     */
    Pagination: {
        /** Root pagination nav layout, centered across the available width. */
        root: {
            class: "mx-auto flex w-full justify-center",
        },
    },
});
