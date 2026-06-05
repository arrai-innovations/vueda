/**
 * @module theme/vueda-tailwind/controls/SelectSeparator.theme
 *
 * Per-component theme registration for SelectSeparator. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * 1px divider between sections inside SelectContent.
     */
    SelectSeparator: {
        /** A 1px horizontal divider between sections inside {@api theme-key:SelectContent.viewport}. See also: {@api theme-key:ComboboxSeparator.root}; delta is a vertical 4px margin (`my-1`) so the divider breathes against the surrounding 4px viewport padding, plus `pointer-events-none` so the hairline never intercepts a click meant for a neighbouring row. */
        root: {
            class: ["bg-border pointer-events-none -mx-1 my-1 h-px"],
        },
    },
});
