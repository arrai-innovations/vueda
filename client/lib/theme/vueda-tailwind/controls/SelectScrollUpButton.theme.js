/**
 * @module theme/vueda-tailwind/controls/SelectScrollUpButton.theme
 *
 * Per-component theme registration for SelectScrollUpButton. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the SelectScrollUpButton slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Scroll-up affordance on long SelectContent lists.
     */
    SelectScrollUpButton: {
        /** The scroll-up affordance that surfaces at the top of a long {@api theme-key:SelectContent.viewport}. 4px tall flex centre so the slot reads as a thin handle rather than a button; the consumer paints the chevron glyph inside. Reka shows / hides the slot automatically based on scroll position. */
        root: {
            class: ["flex cursor-default items-center justify-center py-1"],
        },
    },
});
