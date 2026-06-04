/**
 * @module theme/vueda-tailwind/navigation/Breadcrumb.theme
 *
 * Per-component theme registration for Breadcrumb. Imported as a side effect by
 * Breadcrumb.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the Breadcrumb slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Breadcrumb provides the root context for a trail of hierarchical navigation links.
     */
    Breadcrumb: {
        /** Root context only. The trail's visible layout lives on {@api theme-key:BreadcrumbList.root}. */
        root: { class: "" },
    },
});
