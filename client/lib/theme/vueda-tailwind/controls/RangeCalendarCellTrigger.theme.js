/**
 * @module theme/vueda-tailwind/controls/RangeCalendarCellTrigger.theme
 *
 * Per-component theme registration for RangeCalendarCellTrigger. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the RangeCalendarCellTrigger slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import "./_ButtonPrimitives.theme.js";
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The pressable day button inside a RangeCalendarCell. Carries the
     * selection-start / selection-end states alongside today, disabled,
     * unavailable, and outside-view; composes the ghost-button recipe for
     * hover.
     */
    RangeCalendarCellTrigger: {
        /** The pressable day button inside a {@api theme-key:RangeCalendarCell.root}. See also: {@api theme-key:CalendarCellTrigger.root}; delta is that the single `data-selected` state is replaced by paired `data-selection-start` / `data-selection-end` states that paint `--primary` only at the two endpoints, leaving the middle of the range to read through the `--accent` fill that {@api theme-key:RangeCalendarCell.root} paints on its cell. */
        root: {
            composes: ["_ButtonBase.root", "_ButtonGhost.root"],
            class: [
                "h-[var(--vueda-cal-day)] w-[var(--vueda-cal-day)] p-0 font-normal data-[selected]:opacity-100",
                "[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground",
                "data-[selection-start]:bg-primary data-[selection-start]:text-primary-foreground data-[selection-start]:hover:bg-primary data-[selection-start]:hover:text-primary-foreground data-[selection-start]:focus:bg-primary data-[selection-start]:focus:text-primary-foreground",
                "data-[selection-end]:bg-primary data-[selection-end]:text-primary-foreground data-[selection-end]:hover:bg-primary data-[selection-end]:hover:text-primary-foreground data-[selection-end]:focus:bg-primary data-[selection-end]:focus:text-primary-foreground",
                "data-[outside-view]:text-muted-foreground",
                "data-[disabled]:text-muted-foreground data-[disabled]:opacity-50",
                "data-[unavailable]:text-destructive data-[unavailable]:line-through",
            ],
        },
    },
});
