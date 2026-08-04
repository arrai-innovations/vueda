/**
 * @module theme/vueda-tailwind/controls/RangeCalendarPrevButton.theme
 *
 * Per-component theme registration for RangeCalendarPrevButton. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import "./_ButtonPrimitives.theme.js";
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Previous-month button inside a RangeCalendarHeader. Positioned absolute
     * to the left edge of the header.
     */
    RangeCalendarPrevButton: {
        /** The previous-month button anchored to the left edge of a {@api theme-key:RangeCalendarHeader.root}. Composes {@api theme-key:_ButtonBase.root} plus {@api theme-key:_ButtonOutline.root}, then absolute-positions itself at `left-1` so the button does not consume row flex while the heading floats centred between the two edges. Same square 28×28 transparent plus 50%-opacity-at-rest treatment as {@api theme-key:CalendarNavButton.root}. */
        root: {
            composes: ["_ButtonBase.root", "_ButtonOutline.root"],
            class: ["absolute left-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100"],
        },
    },
});
