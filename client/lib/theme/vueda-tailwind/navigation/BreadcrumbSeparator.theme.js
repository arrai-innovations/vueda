/**
 * @module theme/vueda-tailwind/navigation/BreadcrumbSeparator.theme
 *
 * Per-component theme registration for BreadcrumbSeparator. Imported as a side effect by
 * BreadcrumbSeparator.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the BreadcrumbSeparator slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * BreadcrumbSeparator renders the divider between breadcrumb steps.
     */
    BreadcrumbSeparator: {
        /** Separator glyph sizing. Default markup supplies a slash, while custom children can supply another glyph. */
        root: {
            class: "[&>svg]:size-3.5",
        },
    },
});
