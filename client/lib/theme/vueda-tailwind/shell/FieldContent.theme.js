/**
 * @module theme/vueda-tailwind/shell/FieldContent.theme
 *
 * Per-component theme registration for FieldContent. Imported as a side effect by
 * FieldContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the FieldContent slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * FieldContent groups the non-label content inside a field.
     */
    FieldContent: {
        /**
         * The non-label content stack inside a field. It groups controls, helper text, and validation messages into a compact flex column.
         */
        root: {
            class: "group/field-content flex min-w-0 flex-1 flex-col gap-1.5 leading-snug",
        },
    },
});
