/**
 * @module theme/vueda-tailwind/controls/CalendarCellTrigger.theme
 *
 * Per-component theme registration for CalendarCellTrigger. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the CalendarCellTrigger slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import "./_ButtonPrimitives.theme.js";
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The pressable day button inside a CalendarCell. Carries the today,
     * selected, disabled, unavailable, and outside-view states; composes the
     * ghost-button recipe for hover.
     */
    CalendarCellTrigger: {
        /** The pressable day button inside a {@api theme-key:CalendarCell.root}. Composes {@api theme-key:_ButtonBase.root} plus {@api theme-key:_ButtonGhost.root} so day buttons share the popover-friendly hover recipe with the rest of the picker chrome. Size pins to `--vueda-cal-day` (30×30) so the button sits inside the 32px {@api theme-key:CalendarCell.root} with a 1px breathing margin. Carries the picker's full state matrix: `data-selected` paints `--primary` / `--primary-foreground`, `data-today` (when not selected) paints `--accent`, `data-disabled` and `data-outside-view` mute to `--muted-foreground`, and `data-unavailable` paints `--destructive` plus `line-through`. */
        root: {
            composes: ["_ButtonBase.root", "_ButtonGhost.root"],
            class: [
                "size-[var(--vueda-cal-day)] p-0 font-normal aria-selected:opacity-100 cursor-default",
                "[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground",
                "data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:opacity-100 data-[selected]:hover:bg-primary data-[selected]:hover:text-primary-foreground data-[selected]:focus:bg-primary data-[selected]:focus:text-primary-foreground",
                "data-[disabled]:text-muted-foreground data-[disabled]:opacity-50",
                "data-[unavailable]:text-destructive data-[unavailable]:line-through",
                "data-[outside-view]:text-muted-foreground",
            ],
        },
    },
});
