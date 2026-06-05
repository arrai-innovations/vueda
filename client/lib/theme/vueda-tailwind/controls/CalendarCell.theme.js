/**
 * @module theme/vueda-tailwind/controls/CalendarCell.theme
 *
 * Per-component theme registration for CalendarCell. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * A grid slot inside a CalendarGridRow; the day button sits inside it.
     */
    CalendarCell: {
        /** A grid slot inside a {@api theme-key:CalendarGridRow.root}; the {@api theme-key:CalendarCellTrigger.root} day button sits inside it. `p-0` so the button owns the inner spacing, `flex-1` distributes width evenly across the row, and `relative` plus `focus-within:z-20` lets a focused day button promote above its neighbours when the focus ring would otherwise be clipped by adjacent cells. */
        root: {
            class: ["relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1"],
        },
    },
});
