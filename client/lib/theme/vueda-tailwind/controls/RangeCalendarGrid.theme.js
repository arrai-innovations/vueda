/**
 * @module theme/vueda-tailwind/controls/RangeCalendarGrid.theme
 *
 * Per-component theme registration for RangeCalendarGrid. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The 7-column day grid inside RangeCalendar.
     */
    RangeCalendarGrid: {
        /** See also: {@api theme-key:CalendarGrid.root}; identical recipe. */
        root: {
            class: ["w-full border-collapse space-x-1"],
        },
    },
});
