/**
 * @module theme/vueda-tailwind/controls/TagsInputItemText.theme
 *
 * Per-component theme registration for TagsInputItemText. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The text label inside a TagsInputItem.
     */
    TagsInputItemText: {
        /** The text label inside a {@api theme-key:TagsInputItem.root}. 4px / 8px padding on a transparent fill so the label reads as content sitting inside the secondary-tinted chip rather than carrying its own surface; sm size matches the surrounding {@api theme-key:TagsInputInput.root} so committed and pending text share a tier. */
        root: {
            class: ["py-0.5 px-2 text-sm rounded bg-transparent"],
        },
    },
});
