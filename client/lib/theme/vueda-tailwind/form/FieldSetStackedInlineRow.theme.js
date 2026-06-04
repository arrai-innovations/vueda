/**
 * @module theme/vueda-tailwind/form/FieldSetStackedInlineRow.theme
 *
 * Per-component theme registration for FieldSetStackedInlineRow. Imported as a side effect by
 * FieldSetStackedInlineRow.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 *
 * Prototype-phase duplication: this entry mirrors the FieldSetStackedInlineRow slice of
 * form/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Single row inside a stacked inline field set. Lays out the row fields,
     * before/after hooks, and row-level action bar for create, destroy, and
     * selection controls.
     */
    FieldSetStackedInlineRow: {
        /** Bordered row card with dirty and selected-for-destroy state chrome. */
        root: {
            class: [
                "flex items-start gap-3 border rounded-vueda-card p-2.5",
                "data-[state=dirty]:border-l-2 data-[state=dirty]:border-l-primary",
                "data-[state=selected-for-destroy]:bg-destructive/5 data-[state=selected-for-destroy]:border-destructive/40",
            ],
        },
        /** Fixed leading hook before row fields, commonly used for drag handles or markers. */
        beforeFields: {
            class: ["w-6 shrink-0"],
        },
        /** Trailing hook after row fields and before actions. */
        afterFields: {
            class: ["shrink-0"],
        },
        /** Pass-through wrapper immediately inside a rendered row field. */
        fieldInner: {
            class: [],
        },
        /** Wrapper around each field rendered in the row. */
        field: {
            class: [
                // "rounded", "px-1 lg:px-2 py-1 lg:py-2", "mb-2 lg:mb-4"
            ],
        },
        /** Flexible field column that owns remaining row width. */
        fields: {
            class: ["flex-1 min-w-0"],
        },
        /** Outer action group for row controls, pinned to the row start edge. */
        actionBarOuter: {
            class: ["flex gap-1 2xs:gap-2 items-start shrink-0"],
        },
    },
});
