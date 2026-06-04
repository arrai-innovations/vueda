/**
 * @module theme/vueda-tailwind/form/FilterForm.theme
 *
 * Per-component theme registration for FilterForm. Imported as a side effect by
 * FilterForm.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 *
 * Prototype-phase duplication: this entry mirrors the FilterForm slice of
 * form/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Form body rendered inside a filter popover. Provides the heading and
     * vertical layout for the filter field and submit action.
     */
    FilterForm: {
        /** Vertical form body inside a filter popover. */
        outer: {
            class: ["flex flex-col"],
        },
        /** Filter form heading. */
        heading: {
            class: ["font-bold leading-relaxed"],
        },
    },
});
