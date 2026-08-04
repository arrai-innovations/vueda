/**
 * @module theme/vueda-tailwind/controls/SelectScrollDownButton.theme
 *
 * Per-component theme registration for SelectScrollDownButton. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Scroll-down affordance on long SelectContent lists.
     */
    SelectScrollDownButton: {
        /** See also: {@api theme-key:SelectScrollUpButton.root}; mirror at the bottom of the viewport. */
        root: {
            class: ["flex cursor-default items-center justify-center py-1"],
        },
    },
});
