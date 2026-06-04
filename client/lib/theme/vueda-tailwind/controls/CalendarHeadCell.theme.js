/**
 * @module theme/vueda-tailwind/controls/CalendarHeadCell.theme
 *
 * Per-component theme registration for CalendarHeadCell. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the CalendarHeadCell slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * A weekday-label cell (Mo / Tu / We ...) above the day grid.
     */
    CalendarHeadCell: {
        /** A weekday-label cell (Mo / Tu / We ...) above the day grid. Width pins to `--vueda-cal-cell` (32px) so labels align under the day-button slots below; renders at 0.8rem on `--muted-foreground` so the header row reads as chrome rather than as a row of day buttons. */
        root: {
            class: ["text-muted-foreground rounded-md w-[var(--vueda-cal-cell)] font-normal text-[0.8rem]"],
        },
    },
});
