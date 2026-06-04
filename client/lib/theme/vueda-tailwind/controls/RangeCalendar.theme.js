/**
 * @module theme/vueda-tailwind/controls/RangeCalendar.theme
 *
 * Per-component theme registration for RangeCalendar. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the RangeCalendar slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Two-bookend calendar grid for selecting a start / end date pair.
     * Composed inside date-range-picker popovers.
     */
    RangeCalendar: {
        /** See also: {@api theme-key:Calendar.root}; identical 12px-padded surface, only the grid inside differs (the {@api theme-key:RangeCalendarCell.root} carries the range-fill state). */
        root: {
            class: ["p-3"],
        },
    },
});
