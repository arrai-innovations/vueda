/**
 * @module theme/vueda-tailwind/widgets/WidgetTimeRangeField.theme
 *
 * Per-component theme registration for WidgetTimeRangeField. Imported as a side effect by
 * WidgetTimeRangeField.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Time widget for range fields. Unlike {@api theme-key:WidgetDateRangeField},
     * which fills one shell with both segment groups, this widget composes two
     * separate {@api theme-key:TimeField.root} shells around a separator.
     */
    WidgetTimeRangeField: {
        /** The row holding both bounds and the separator. Without it the two shells are block-level and stack, so a time range reads as two unrelated fields. */
        root: {
            class: ["flex w-full items-center gap-2"],
        },
        /** Each bound's segment shell. Shares the row evenly and may shrink, so a narrow column keeps both bounds on one line. */
        field: {
            class: ["flex-1 min-w-0"],
        },
        /** Pass-through hook for the literal separators inside a bound (":"). Segment type comes from {@api theme-key:TimeFieldInput.root}. */
        literal: {
            class: [],
        },
        /** The en dash between the two bounds. Muted and fixed-width so it reads as a range connector rather than a segment. */
        separator: {
            class: ["shrink-0 text-muted-foreground"],
        },
    },
});
