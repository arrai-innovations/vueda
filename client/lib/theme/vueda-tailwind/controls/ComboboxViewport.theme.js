/**
 * @module theme/vueda-tailwind/controls/ComboboxViewport.theme
 *
 * Per-component theme registration for ComboboxViewport. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the ComboboxViewport slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Scrollable region inside ComboboxList that wraps the results.
     */
    ComboboxViewport: {
        /** The scrollable region inside {@api theme-key:ComboboxList.root} that wraps the result groups. Caps at 300px tall before the viewport begins to scroll; `scroll-py-1` keeps a hairline of breathing room above the first and below the last visible row so a focused item never crashes into the viewport edge. */
        root: {
            class: ["max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto"],
        },
    },
});
