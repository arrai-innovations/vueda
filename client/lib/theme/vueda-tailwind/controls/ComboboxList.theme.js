/**
 * @module theme/vueda-tailwind/controls/ComboboxList.theme
 *
 * Per-component theme registration for ComboboxList. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the ComboboxList slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The floating popover surface that holds the Combobox results.
     */
    ComboboxList: {
        /** The floating popover surface that holds the {@api theme-key:ComboboxItem.root} rows. Reads as a popover: 2px control radius, `--popover` fill, 1px border, and `shadow-vueda-popover` elevation, with the standard side-aware enter / exit transforms anchored on `--reka-combobox-content-transform-origin` so the surface scales out of the corner closest to the trigger. Fixed 200px width matches {@api theme-key:ComboboxAnchor.root}; the inner {@api theme-key:ComboboxViewport.root} owns scrolling. */
        root: {
            class: [
                "z-50 w-[200px] rounded-vueda-control border bg-popover text-popover-foreground origin-(--reka-combobox-content-transform-origin) overflow-hidden shadow-vueda-popover outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            ],
        },
    },
});
