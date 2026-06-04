/**
 * @module theme/vueda-tailwind/shell/FieldLegend.theme
 *
 * Per-component theme registration for FieldLegend. Imported as a side effect by
 * FieldLegend.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the FieldLegend slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * FieldLegend styles grouped-field headings used as legends or label-like text.
     */
    FieldLegend: {
        /**
         * The legend or label-style heading for grouped fields. Its variant attribute chooses between larger legend text and compact label text.
         */
        root: {
            class: "mb-3 font-medium data-[variant=legend]:text-base data-[variant=label]:text-sm",
        },
    },
});
