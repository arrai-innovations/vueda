/**
 * @module theme/vueda-tailwind/navigation/PaginationContent.theme
 *
 * Per-component theme registration for PaginationContent. Imported as a side effect by
 * PaginationContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the PaginationContent slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * PaginationContent arranges pagination controls in a compact row.
     */
    PaginationContent: {
        /** Compact row that groups page controls without owning their button chrome. */
        root: {
            class: "flex flex-row items-center gap-1",
        },
    },
});
