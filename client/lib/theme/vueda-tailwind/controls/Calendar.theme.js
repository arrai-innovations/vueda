/**
 * @module theme/vueda-tailwind/controls/Calendar.theme
 *
 * Per-component theme registration for Calendar. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the Calendar slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Single-date calendar grid. Composed inside date-picker popovers, or
     * embedded inline when a full grid is the primary surface.
     */
    Calendar: {
        /** The outer surface that hosts the month grid. Pure 12px padding (`p-3`) and no border or shadow of its own; chrome belongs to the host (a {@api theme-key:PopoverContent.root} when used in a date-picker popover, or the surrounding view when embedded inline). No footer either: {@api theme-key:CalendarFooter.root} is a separate chin attached below by composition, so a footer-free embed renders as a bare grid. */
        root: {
            class: ["p-3"],
        },
    },
});
