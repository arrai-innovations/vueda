/**
 * @module theme/vueda-tailwind/controls/CalendarHeading.theme
 *
 * Per-component theme registration for CalendarHeading. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the CalendarHeading slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The month-year title text inside a CalendarHeader.
     */
    CalendarHeading: {
        /** The month-year title text inside a {@api theme-key:CalendarHeader.root}. Single-line `text-sm font-medium`; sits centred between the prev / next nav buttons. */
        root: {
            class: ["text-sm font-medium"],
        },
    },
});
