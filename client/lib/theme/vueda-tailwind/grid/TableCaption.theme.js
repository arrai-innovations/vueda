/**
 * @module theme/vueda-tailwind/grid/TableCaption.theme
 *
 * Per-component theme registration for TableCaption. Imported as a side effect
 * by TableCaption.vue, so a route chunk that pulls only that SFC drags only
 * this component's theme entry, not the entire grid family.
 *
 * Prototype-phase duplication: this entry mirrors the TableCaption slice of
 * grid/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Native table caption for supporting text below a table. Uses the muted
     * body-text treatment shared by data-grid helper copy.
     */
    TableCaption: {
        /**
         * The native caption below a table. Use it for low-emphasis supporting copy tied to the table, with spacing that keeps it visually outside the bordered data surface.
         */
        root: {
            class: "text-muted-foreground mt-4 text-body",
        },
    },
});
