/**
 * @module theme/vueda-tailwind/form/FilterGroup.theme
 *
 * Per-component theme registration for FilterGroup. Imported as a side effect by
 * FilterGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 *
 * Prototype-phase duplication: this entry mirrors the FilterGroup slice of
 * form/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Filter toolbar for model list views. Arranges active filter controls,
     * message content, and the wrapper that hosts each `FilterComponent`.
     */
    FilterGroup: {
        /** Toolbar root. */
        root: {
            class: "flex-col ",
        },
        /** Wrapping row for active filter controls. */
        filtersWrapper: {
            class: "flex flex-wrap gap-1 mt-1",
        },
        /** Message area above or near the filter controls. */
        messageWrapper: {
            class: "flex my-2",
        },
    },
});
