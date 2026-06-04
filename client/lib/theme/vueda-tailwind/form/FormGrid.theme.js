/**
 * @module theme/vueda-tailwind/form/FormGrid.theme
 *
 * Per-component theme registration for FormGrid. Imported as a side effect by
 * FormGrid.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 *
 * Prototype-phase duplication: this entry mirrors the FormGrid slice of
 * form/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Responsive 12-column grid for form fields. Direct children default to
     * full width and can opt into configured column spans at the form
     * breakpoint.
     */
    FormGrid: {
        /** Twelve-column field grid with `data-col` span hooks at the form breakpoint. */
        root: {
            class: [
                "grid grid-cols-12 gap-x-5 gap-y-4 min-w-0",
                "[&>*]:col-span-12 [&>*]:min-w-0",
                "[@media(min-width:720px)]:[&>[data-col='3']]:col-span-3",
                "[@media(min-width:720px)]:[&>[data-col='4']]:col-span-4",
                "[@media(min-width:720px)]:[&>[data-col='6']]:col-span-6",
                "[@media(min-width:720px)]:[&>[data-col='8']]:col-span-8",
                "[@media(min-width:720px)]:[&>[data-col='9']]:col-span-9",
            ],
        },
    },
});
