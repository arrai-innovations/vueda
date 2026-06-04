/**
 * @module theme/vueda-tailwind/navigation/BreadcrumbLink.theme
 *
 * Per-component theme registration for BreadcrumbLink. Imported as a side effect by
 * BreadcrumbLink.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the BreadcrumbLink slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * BreadcrumbLink styles navigable breadcrumb steps.
     */
    BreadcrumbLink: {
        /** Navigable trail step. Hover and focus move toward foreground without changing weight. */
        root: {
            class: "hover:text-foreground transition-colors rounded-vueda-control focus-visible:focus-ring",
        },
    },
});
