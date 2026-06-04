/**
 * @module theme/vueda-tailwind/controls/ComboboxInput.theme
 *
 * Per-component theme registration for ComboboxInput. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the ComboboxInput slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Search field at the top of a Combobox popover. Sized to the large
     * control-height tier (`h-vueda-control-lg`) so it reads as the primary
     * surface inside the popover.
     */
    ComboboxInput: {
        /** The search field at the top of a {@api theme-key:ComboboxList.root}. Sized to the large control-height tier (`h-vueda-control-lg`) so the input reads as the primary surface inside the popover; renders chrome-free (`bg-transparent`, no border or focus ring) because the surrounding popover already owns the elevation and ring contracts. The Combobox trigger that opens the popover wears the input shell instead. */
        root: {
            class: [
                "placeholder:text-muted-foreground flex h-vueda-control-lg w-full rounded-vueda-control bg-transparent text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },
});
