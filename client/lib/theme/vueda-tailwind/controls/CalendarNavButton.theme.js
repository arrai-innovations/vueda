/**
 * @module theme/vueda-tailwind/controls/CalendarNavButton.theme
 *
 * Per-component theme registration for CalendarNavButton. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import "./_ButtonPrimitives.theme.js";
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Prev / next month button inside a CalendarHeader. One theme key serves
     * both directional buttons (CalendarPrevButton.vue and
     * CalendarNextButton.vue), which diverges from the
     * RangeCalendarPrevButton / RangeCalendarNextButton split; see
     * BACKLOG-011 for the reconciliation question.
     */
    CalendarNavButton: {
        /** The prev / next month button anchored to a {@api theme-key:CalendarHeader.root}. Composes {@api theme-key:_ButtonBase.root} plus {@api theme-key:_ButtonOutline.root} for the neutral chip recipe, then overrides to a square 28×28 transparent chip with `opacity-50` at rest and full opacity on hover so the chrome stays out of the way until the user reaches for it. One theme key serves both directional SFCs (CalendarPrevButton, CalendarNextButton); the {@api theme-key:RangeCalendarPrevButton.root} / {@api theme-key:RangeCalendarNextButton.root} pair on the range side stays split; see BACKLOG-011 for the reconciliation question. */
        root: {
            composes: ["_ButtonBase.root", "_ButtonOutline.root"],
            class: ["size-7 bg-transparent p-0 opacity-50 hover:opacity-100"],
        },
    },
});
