/**
 * @module theme/vueda-tailwind/widgets/WidgetDuration.theme
 *
 * Per-component theme registration for WidgetDuration. Imported as a side effect by
 * WidgetDuration.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
 */
import { patchTheme } from "@vueda/theme/vueda-tailwind/registry.js";

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
        /** The segment before the spinners that marks a negative duration, stacked like a unit segment. */
        sign: {
            class: ["flex flex-col gap-1"],
        },
        /** The minus sign under the segment's label, centered in the height the spinners take. */
        signSymbol: {
            class: ["flex flex-1 items-center text-base font-medium"],
        },
        /** The visible unit label above each spinner, associated with that unit's input. */
        unitLabel: {
            class: ["text-xs text-muted-foreground"],
        },
    },
});
