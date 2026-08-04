/**
 * @module theme/vueda-tailwind/controls/RangeCalendarHeadCell.theme
 *
 * Per-component theme registration for RangeCalendarHeadCell. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * A weekday-label cell above the RangeCalendar day grid.
     */
    RangeCalendarHeadCell: {
        /** See also: {@api theme-key:CalendarHeadCell.root}; identical recipe (the class-order difference vs the single-calendar slot is incidental, not a deliberate departure). */
        root: {
            class: ["w-[var(--vueda-cal-cell)] rounded-md text-[0.8rem] font-normal text-muted-foreground"],
        },
    },
});
