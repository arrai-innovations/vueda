/**
 * @module theme/vueda-tailwind/controls/ComboboxSeparator.theme
 *
 * Per-component theme registration for ComboboxSeparator. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * 1px divider between sections inside a Combobox.
     */
    ComboboxSeparator: {
        /** A 1px horizontal divider between groups inside {@api theme-key:ComboboxList.root}. Renders as a flat `--border` hairline rather than the DPR-aware `hairline` utility because the separator sits inside a popover that already paints its own border at the same width, so the visual seam never reads as a doubled line. `-mx-1` extends the divider to the popover edge past the group's 4px inner padding. */
        root: {
            class: ["bg-border -mx-1 h-px"],
        },
    },
});
