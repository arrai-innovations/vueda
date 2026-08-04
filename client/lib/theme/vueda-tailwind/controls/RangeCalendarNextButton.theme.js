/**
 * @module theme/vueda-tailwind/controls/RangeCalendarNextButton.theme
 *
 * Per-component theme registration for RangeCalendarNextButton. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import "./_ButtonPrimitives.theme.js";
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Next-month button inside a RangeCalendarHeader. Positioned absolute to
     * the right edge of the header.
     */
    RangeCalendarNextButton: {
        /** See also: {@api theme-key:RangeCalendarPrevButton.root}; mirror anchored to the right edge of the header at `right-1`. */
        root: {
            composes: ["_ButtonBase.root", "_ButtonOutline.root"],
            class: ["absolute right-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100"],
        },
    },
});
