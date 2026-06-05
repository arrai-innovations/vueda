/**
 * @module theme/vueda-tailwind/controls/TagsInputItemDelete.theme
 *
 * Per-component theme registration for TagsInputItemDelete. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The remove (x) button at the trailing edge of a TagsInputItem.
     */
    TagsInputItemDelete: {
        /** The remove (x) button at the trailing edge of a {@api theme-key:TagsInputItem.root}. Transparent fill so the button rides on the chip's secondary surface rather than punching its own swatch; the trailing 4px margin separates the glyph from the chip's pill end so the hit target does not run into the rounded edge. */
        root: {
            class: ["flex rounded bg-transparent mr-1"],
        },
    },
});
