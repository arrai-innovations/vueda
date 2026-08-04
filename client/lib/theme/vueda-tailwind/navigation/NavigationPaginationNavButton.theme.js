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
        /** Previous, next, first, or last control. Icon-only, outline, compact (sm) square: composes the Button base and outline variant and pins a `size-vueda-control-sm` square so the four edge controls read as a dense, single-tier cluster. The accessible name rides an `sr-only` label in each SFC; the visible glyph comes from the icon registry. */
        root: {
            composes: ["_ButtonBase.root", "_ButtonOutline.root"],
            class: ["size-vueda-control-sm"],
        },
    },
});
