/**
 * @module theme/vueda-tailwind/controls/NativeSelectOption.theme
 *
 * Per-component theme registration for NativeSelectOption. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the NativeSelectOption slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Native `<option>` styled to inherit the popover surface.
     */
    NativeSelectOption: {
        /** The native `<option>` tinted to inherit the popover surface. Per-row layout, highlight, and check indicator are all owned by the OS; for richer option chrome (icons, sub-labels, highlighted-vs-checked distinction) use {@api theme-key:SelectItem} or {@api theme-key:ComboboxItem}. */
        root: {
            class: ["bg-popover text-popover-foreground"],
        },
    },
});
