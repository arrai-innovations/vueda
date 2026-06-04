/**
 * @module theme/vueda-tailwind/navigation/NavigationPaginationBar.theme
 *
 * Per-component theme registration for NavigationPaginationBar. Imported as a side effect by
 * PaginationBar.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the NavigationPaginationBar slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * NavigationPaginationBar styles a pagination bar anchored below a navigation surface.
     */
    NavigationPaginationBar: {
        /** Footer bar for table and objects-grid pagination, seated against the bottom of card-like data surfaces. */
        root: {
            class: "flex w-full items-center justify-between gap-3 rounded-b-vueda-card border-t border-border bg-card px-3 py-2",
        },
    },
});
