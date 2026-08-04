/**
 * @module theme/vueda-tailwind/controls/RangeCalendarHeader.theme
 *
 * Per-component theme registration for RangeCalendarHeader. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Title row above the RangeCalendar grid. Holds the heading and the
     * prev / next nav buttons.
     */
    RangeCalendarHeader: {
        /** The title row above a {@api theme-key:RangeCalendar.root}'s day grid. See also: {@api theme-key:CalendarHeader.root}; delta is that the prev / next buttons inside ({@api theme-key:RangeCalendarPrevButton.root} / {@api theme-key:RangeCalendarNextButton.root}) anchor to the row edges via `position: absolute`, so this header does not reserve `px-8` the way the single-calendar header does. */
        root: {
            class: ["flex justify-center pt-1 relative items-center w-full"],
        },
    },
});
