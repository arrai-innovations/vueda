/**
 * @module theme/vueda-tailwind/controls/NativeSelect.theme
 *
 * Per-component theme registration for NativeSelect. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the NativeSelect slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Native `<select>` styled to match the VUEDA control shell. Used where a
     * JS-driven combobox or select would be overkill (short fixed enums on
     * touch devices, fallback contexts).
     */
    NativeSelect: {
        /** The native `<select>` styled to match the VUEDA control shell. Used where a JS-driven {@api theme-key:SelectTrigger} or {@api theme-key:ComboboxTrigger} would be overkill: short fixed enums on touch devices, environments where native menu UX is preferred. Same control-height + hairline + focus + `aria-invalid` recipe as {@api theme-key:Input.root}; `appearance-none` strips the native chevron and `pr-9` reserves space for the icon the consumer paints. The option surface inside the dropdown is owned by the OS; deep styling lives in the JS-driven pickers. */
        root: {
            class: [
                "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 dark:hover:bg-input/50 hairline h-vueda-control w-full min-w-0 appearance-none rounded-vueda-control bg-transparent px-vueda-control-px pr-9 text-sm shadow-vueda-control transition-shadow disabled:pointer-events-none disabled:cursor-not-allowed",
                "focus-visible:hairline-ring focus-visible:focus-ring-shadow",
                "aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive",
            ],
        },
    },
});
