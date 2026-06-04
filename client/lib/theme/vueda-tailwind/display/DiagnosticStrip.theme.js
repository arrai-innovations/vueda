/**
 * @module theme/vueda-tailwind/display/DiagnosticStrip.theme
 *
 * Per-component theme registration for DiagnosticStrip. Imported as a side effect by
 * DiagnosticStrip.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 *
 * Prototype-phase duplication: this entry mirrors the DiagnosticStrip slice of
 * display/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DiagnosticStrip renders compact key-value diagnostics in a bordered two-column grid. The component may add mono treatment to values while the theme key owns the shared strip structure.
     */
    DiagnosticStrip: {
        /** Compact diagnostic definition-list grid for request, route, or session values. */
        root: {
            class: [
                "grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1",
                "rounded-vueda-card border border-border bg-muted/35",
                "px-3 py-2",
            ],
        },
        /** Uppercase diagnostic label cell. */
        dt: {
            class: ["text-[10px] font-semibold uppercase tracking-[0.06em]", "text-muted-foreground leading-none"],
        },
        /** Diagnostic value cell; the component adds mono treatment when requested. */
        dd: {
            class: ["text-[11px] font-normal text-foreground leading-none m-0"],
        },
    },
});
