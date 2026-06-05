/**
 * @module theme/vueda-tailwind/controls/ButtonGroupText.theme
 *
 * Per-component theme registration for ButtonGroupText. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the ButtonGroupText slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Static text segment inside a ButtonGroup; reads as a label-style chip
     * joined to its neighbouring controls.
     */
    ButtonGroupText: {
        /** The static-label chip used to join readable copy ("of", "to", a unit suffix) into a {@api theme-key:ButtonGroup}. Wears the button shape (2px control radius, 1px border, `shadow-vueda-control`) but sits on `--muted` so it does not read as pressable; padding picks 16px to match the default button's `px-vueda-control-px` baseline. */
        root: {
            class: [
                "bg-muted text-muted-foreground flex items-center gap-2 rounded-vueda-control border px-4 text-sm font-medium shadow-vueda-control [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },
});
