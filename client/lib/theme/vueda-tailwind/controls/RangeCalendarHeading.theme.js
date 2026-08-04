/**
 * @module theme/vueda-tailwind/controls/RangeCalendarHeading.theme
 *
 * Per-component theme registration for RangeCalendarHeading. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The month-year title text inside a RangeCalendarHeader.
     */
    RangeCalendarHeading: {
        /** See also: {@api theme-key:CalendarHeading.root}; identical recipe. */
        root: {
            class: ["text-sm font-medium"],
        },
    },
});
