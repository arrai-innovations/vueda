/**
 * @module theme/vueda-tailwind/navigation/PaginationMeta.theme
 *
 * Per-component theme registration for PaginationMeta. Imported as a side effect by
 * PaginationMeta.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * PaginationMeta styles the compact record or page-count text shown with pagination.
     */
    PaginationMeta: {
        /** Compact mono count text for page or record summaries. See also: {@api theme-key:NavigationPaginationBar.root}. */
        root: {
            class: [
                // Type and color.
                "font-mono text-[length:var(--vueda-text-supporting)] leading-none text-muted-foreground whitespace-nowrap",
            ],
        },
    },
});
