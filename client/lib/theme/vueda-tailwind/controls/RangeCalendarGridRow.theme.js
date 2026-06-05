/**
 * @module theme/vueda-tailwind/controls/RangeCalendarGridRow.theme
 *
 * Per-component theme registration for RangeCalendarGridRow. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * A single week row inside a RangeCalendarGrid.
     */
    RangeCalendarGridRow: {
        /** See also: {@api theme-key:CalendarGridRow.root}; identical recipe. */
        root: {
            class: ["flex"],
        },
    },
});
