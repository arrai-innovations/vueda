/**
 * @module theme/vueda-tailwind/widgets/WidgetDuration.theme
 *
 * Per-component theme registration for WidgetDuration. Imported as a side effect by
 * WidgetDuration.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
 *
 * Prototype-phase duplication: this entry mirrors the WidgetDuration slice of
 * widgets/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Multi-part duration widget. Lays out the duration segments as wrapping
     * field columns with consistent spacing.
     */
    WidgetDuration: {
        /** The root intentionally carries no chrome so form layout owns spacing. */
        root: {
            class: [],
        },
        /** The inner row wraps duration segments when narrow columns run out of space. */
        inner: {
            class: ["flex flex-row gap-2 flex-wrap"],
        },
        /** Each duration segment stacks its label and control while sharing leftover width. */
        innerItem: {
            class: ["flex flex-col flex-grow"],
        },
    },
});
