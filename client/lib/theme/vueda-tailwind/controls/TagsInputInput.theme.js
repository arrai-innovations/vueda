/**
 * @module theme/vueda-tailwind/controls/TagsInputInput.theme
 *
 * Per-component theme registration for TagsInputInput. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the TagsInputInput slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The free-text entry field inside a TagsInput. Sized to the chip height
     * so committed and pending text share a baseline.
     */
    TagsInputInput: {
        /** The free-text entry field inside a {@api theme-key:TagsInput.root}. Sized to `--vueda-chip-height` so pending text shares a baseline with the committed chips beside it; renders chrome-free (transparent fill, no border, no focus ring) because the surrounding shell owns the chip-row contract and fires the focus ring on its own when the input is focused. `flex-1` lets the field absorb the remaining row width inside the wrap so the typing affordance always reaches the trailing edge. */
        root: {
            class: ["text-sm min-h-[var(--vueda-chip-height)] focus:outline-none flex-1 bg-transparent px-1"],
        },
    },
});
