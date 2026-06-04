/**
 * @module theme/vueda-tailwind/widgets/WidgetTemplateLegend.theme
 *
 * Per-component theme registration for WidgetTemplateLegend. Imported as a side effect by
 * WidgetTemplateLegend.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
 *
 * Prototype-phase duplication: this entry mirrors the WidgetTemplateLegend slice of
 * widgets/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Legend for template placeholders or merge tags. Displays helper entries
     * in a compact vertical list that can widen at larger breakpoints.
     */
    WidgetTemplateLegend: {
        /** The root stays unstyled so the legend can be embedded beside any template widget. */
        root: {
            class: [],
        },
        /** The inner column spaces placeholder entries evenly. */
        inner: {
            class: ["flex flex-col gap-2"],
        },
        /** Each legend item stacks on small screens and becomes a baseline row on wider screens. */
        listItem: {
            class: ["flex flex-col sm:flex-row items-baseline px-2 sm:px-4"],
        },
    },
});
