/**
 * @module theme/vueda-tailwind/widgets/WidgetDuration.theme
 *
 * Per-component theme registration for WidgetDuration. Imported as a side effect by
 * WidgetDuration.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
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
            class: ["flex flex-col flex-grow gap-1"],
        },
        /** The visible unit label above each spinner, associated with that unit's input. */
        unitLabel: {
            class: ["text-xs text-muted-foreground"],
        },
    },
});
