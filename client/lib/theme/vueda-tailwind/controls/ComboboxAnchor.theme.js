/**
 * @module theme/vueda-tailwind/controls/ComboboxAnchor.theme
 *
 * Per-component theme registration for ComboboxAnchor. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the ComboboxAnchor slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Positioning anchor for the Combobox popover. Usually wraps the trigger
     * so the popover aligns to the input.
     */
    ComboboxAnchor: {
        /** The positioning anchor for the {@api theme-key:ComboboxList.root} popover. Pins to a 200px width by default so a Combobox that anchors to whitespace (rather than the trigger element) still has a sensible reference rectangle; consumers that wrap the trigger in the anchor inherit the trigger's width instead and can ignore this default. Layout-only slot; no chrome of its own. */
        root: {
            class: ["w-[200px]"],
        },
    },
});
