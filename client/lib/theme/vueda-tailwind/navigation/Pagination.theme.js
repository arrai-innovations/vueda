/**
 * @module theme/vueda-tailwind/navigation/Pagination.theme
 *
 * Per-component theme registration for Pagination. Imported as a side effect by
 * Pagination.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the Pagination slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
