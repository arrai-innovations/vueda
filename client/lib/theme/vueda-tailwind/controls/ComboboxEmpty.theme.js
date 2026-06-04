/**
 * @module theme/vueda-tailwind/controls/ComboboxEmpty.theme
 *
 * Per-component theme registration for ComboboxEmpty. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the ComboboxEmpty slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Placeholder shown inside ComboboxList when the search has zero results.
     */
    ComboboxEmpty: {
        /** The zero-result placeholder shown inside {@api theme-key:ComboboxList.root} when the search has no matches. Centred sm text inside 24px vertical padding so the empty state reads as a deliberate pause rather than a collapsed popover; consumers supply their own copy. */
        root: {
            class: ["py-6 text-center text-sm"],
        },
    },
});
