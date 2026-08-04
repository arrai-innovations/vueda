/**
 * @module theme/vueda-tailwind/controls/ComboboxItemIndicator.theme
 *
 * Per-component theme registration for ComboboxItemIndicator. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Indicator (check mark, etc.) on a selected ComboboxItem.
     */
    ComboboxItemIndicator: {
        /** The trailing selected-state glyph on a {@api theme-key:ComboboxItem.root} (typically a check mark). `ml-auto` pushes the indicator to the row's trailing edge; size and colour are inherited from the surrounding row so the indicator picks up the highlight swap without painting its own state. */
        root: {
            class: ["ml-auto"],
        },
    },
});
