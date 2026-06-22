/**
 * @module theme/vueda-tailwind/navigation/NavigationPaginationNavButton.theme
 *
 * Per-component theme registration for NavigationPaginationNavButton. Imported as a side effect by
 * PaginationPrevious.vue, PaginationNext.vue, PaginationFirst.vue, and PaginationLast.vue,
 * so a route chunk that pulls only those SFCs drags only this
 * component's theme entry, not the entire navigation family.
 */
import "@vueda/theme/vueda-tailwind/controls/_ButtonPrimitives.theme.js";
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * NavigationPaginationNavButton styles pagination controls that move to previous, next, first, or last pages.
     */
    NavigationPaginationNavButton: {
        /** Previous, next, first, or last control. It stays ghost but adds room for a label. */
        root: {
            composes: ["_ButtonBase.root", "_ButtonGhost.root"],
            class: ["gap-1 px-2.5 sm:pr-2.5"],
        },
    },
});
