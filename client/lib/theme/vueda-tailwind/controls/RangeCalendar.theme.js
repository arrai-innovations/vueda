/**
 * @module theme/vueda-tailwind/controls/RangeCalendar.theme
 *
 * Per-component theme registration for RangeCalendar. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Two-bookend calendar grid for selecting a start / end date pair.
     * Composed inside date-range-picker popovers.
     */
    RangeCalendar: {
        /** See also: {@api theme-key:Calendar.root}; identical 12px-padded surface, only the grid inside differs (the {@api theme-key:RangeCalendarCell.root} carries the range-fill state). */
        root: {
            class: ["p-3"],
        },
    },
});
