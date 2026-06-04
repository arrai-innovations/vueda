/**
 * @module theme/vueda-tailwind/navigation/PaginationMeta.theme
 *
 * Per-component theme registration for PaginationMeta. Imported as a side effect by
 * PaginationMeta.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the PaginationMeta slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * PaginationMeta styles the compact record or page-count text shown with pagination.
     */
    PaginationMeta: {
        /** Compact mono count text for page or record summaries. See also: {@api theme-key:NavigationPaginationBar.root}. */
        root: {
            class: "font-mono text-[length:var(--vueda-text-supporting)] leading-none text-muted-foreground whitespace-nowrap",
        },
    },
});
