/**
 * @module theme/vueda-tailwind/controls/SelectScrollDownButton.theme
 *
 * Per-component theme registration for SelectScrollDownButton. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the SelectScrollDownButton slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
