/**
 * @module theme/vueda-tailwind/controls/DateFieldInput.theme
 *
 * Per-component theme registration for DateFieldInput. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Individual date segment inside DateField. Mono + tabular + slashed-zero
     * so digit widths and 0/O distinction stay stable; focused segment
     * highlights with `--accent`.
     */
    DateFieldInput: {
        /** A single editable date segment (year / month / day). Renders in `--vueda-font-mono` at `font-medium` with `font-feature-settings: 'tnum','zero'` so digit widths stay stable as values change and `0` remains visually distinct from `O`. The focused segment paints `--accent` / `--accent-foreground` (same recipe as a menu-item-highlighted row, since a focused segment is a selection); `caret-transparent` hides the text caret because segments edit via arrow keys rather than free-form typing, and `data-[placeholder]` mutes the segment to `--muted-foreground` while empty. */
        root: {
            class: [
                // Segment layout and type.
                "inline rounded-sm px-0.5 text-center font-mono font-medium [font-feature-settings:'tnum','zero']",

                // Caret, focus, and placeholder states.
                "caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder]:text-muted-foreground",
            ],
        },
    },
});
