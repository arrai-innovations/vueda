/**
 * @module theme/vueda-tailwind/controls/ComboboxItemIndicator.theme
 *
 * Per-component theme registration for ComboboxItemIndicator. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the ComboboxItemIndicator slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
