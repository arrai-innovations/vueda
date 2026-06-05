/**
 * @module theme/vueda-tailwind/controls/CalendarGrid.theme
 *
 * Per-component theme registration for CalendarGrid. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The 7-column day grid inside Calendar.
     */
    CalendarGrid: {
        /** The 7-column day grid. `border-collapse` lets adjacent cell borders share one hairline rather than doubling at the seam; `w-full` lets the grid stretch to the {@api theme-key:Calendar.root} content width so cell sizing falls out of `flex-1` on {@api theme-key:CalendarCell.root}. */
        root: {
            class: ["w-full border-collapse space-x-1"],
        },
    },
});
