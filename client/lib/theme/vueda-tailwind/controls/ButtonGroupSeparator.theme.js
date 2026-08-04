/**
 * @module theme/vueda-tailwind/controls/ButtonGroupSeparator.theme
 *
 * Per-component theme registration for ButtonGroupSeparator. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * 1px vertical (or horizontal) divider between joined items inside a
     * ButtonGroup.
     */
    ButtonGroupSeparator: {
        /** The explicit divider used inside a {@api theme-key:ButtonGroup} when the segmented cluster needs a visible split between text segments. Uses the `--input` token so the divider matches the surrounding hairline color in both modes, and stretches to the group's cross-axis. */
        root: {
            class: ["bg-input relative !m-0 self-stretch data-[orientation=vertical]:h-auto"],
        },
    },
});
