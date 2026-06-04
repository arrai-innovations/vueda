/**
 * @module theme/vueda-tailwind/controls/CalendarFooter.theme
 *
 * Per-component theme registration for CalendarFooter. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the CalendarFooter slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Optional chin below a Calendar (or RangeCalendar) carrying a date
     * summary and an action row (Apply / Clear). Used by date-picker popovers
     * that need a status line plus actions; the bare Calendar stays
     * footer-free so it can be embedded without chrome it cannot use.
     */
    CalendarFooter: {
        /** The optional chin slot below a {@api theme-key:Calendar.root} or {@api theme-key:RangeCalendar.root}. Flex row with a `border-t` separator and an 8px gap; used by date-picker popovers that need a date-summary line plus an action row (Apply / Clear). Calendar and RangeCalendar themselves stay footer-free so the bare grid can be embedded without chrome it cannot use. */
        root: {
            class: ["flex items-center justify-between gap-2 mt-2 pt-2 border-t"],
        },
        /** The date-readout span inside a {@api theme-key:CalendarFooter.root}. Mono plus tabular plus slashed-zero (`font-feature-settings: 'tnum','zero'`) so the date string stays digit-aligned with the segment text in the trigger that opened the popover; renders at `--vueda-text-supporting` size with `leading-none` on `--muted-foreground` so the chin reads as status, not primary copy. */
        summary: {
            class: [
                "font-mono font-medium text-[length:var(--vueda-text-supporting)] leading-none text-muted-foreground [font-feature-settings:'tnum','zero']",
            ],
        },
    },
});
