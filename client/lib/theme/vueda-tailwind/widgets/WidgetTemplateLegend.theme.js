/**
 * @module theme/vueda-tailwind/widgets/WidgetTemplateLegend.theme
 *
 * Per-component theme registration for WidgetTemplateLegend. Imported as a side effect by
 * WidgetTemplateLegend.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
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
