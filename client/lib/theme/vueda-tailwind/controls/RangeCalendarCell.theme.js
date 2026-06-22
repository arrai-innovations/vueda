/**
 * @module theme/vueda-tailwind/controls/RangeCalendarCell.theme
 *
 * Per-component theme registration for RangeCalendarCell. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * A grid slot inside a RangeCalendarGridRow. Carries the range-fill
     * background so selection-start / end corners round independently of the
     * day button radius.
     */
    RangeCalendarCell: {
        /** A grid slot inside a {@api theme-key:RangeCalendarGridRow.root}. Same `p-0` plus `relative` plus `focus-within:z-20` layout shape as {@api theme-key:CalendarCell.root}, plus the range-fill recipe: `[&:has([data-selected])]:bg-accent` paints `--accent` on the cell (not on the day button) whenever the inner trigger is part of the selected range, so middle cells render as a continuous strip while the `data-selection-start` and `data-selection-end` cells round only their outer corners via the `[&:has([data-selected][data-selection-start])]` / `[&:has([data-selected][data-selection-end])]` variants. Range fill goes on the cell rather than the day button so the run can round cleanly at its endpoints. */
        root: {
            class: [
                // Layout and focus stacking.
                "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",

                // Range fill and endpoint rounding.
                "[&:has([data-selected])]:bg-accent first:[&:has([data-selected])]:rounded-l-vueda-cal-day last:[&:has([data-selected])]:rounded-r-vueda-cal-day",
                "[&:has([data-selected][data-selection-end])]:rounded-r-vueda-cal-day [&:has([data-selected][data-selection-start])]:rounded-l-vueda-cal-day",
            ],
        },
    },
});
