/**
 * @module theme/vueda-tailwind/controls/CalendarHeader.theme
 *
 * Per-component theme registration for CalendarHeader. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Title row above the Calendar grid. Holds the heading and the prev / next
     * nav buttons.
     */
    CalendarHeader: {
        /** The title row above the day grid. Flex-centred so the {@api theme-key:CalendarHeading.root} sits in the middle of the row, with `px-8` reserving 32px of side padding for the prev / next {@api theme-key:CalendarNavButton.root} pair that the component anchors to the row edges. */
        root: {
            class: ["flex justify-center pt-1 relative items-center w-full px-8"],
        },
    },
});
