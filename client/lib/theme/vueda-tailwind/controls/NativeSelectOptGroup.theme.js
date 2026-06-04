/**
 * @module theme/vueda-tailwind/controls/NativeSelectOptGroup.theme
 *
 * Per-component theme registration for NativeSelectOptGroup. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the NativeSelectOptGroup slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Native `<optgroup>` styled to inherit the popover surface.
     */
    NativeSelectOptGroup: {
        /** The native `<optgroup>` tinted to inherit the popover surface so the system's native dropdown reads as the same surface family as VUEDA's JS-driven pickers. The OS owns layout and the divider between groups; this slot only paints the background. */
        root: {
            class: ["bg-popover text-popover-foreground"],
        },
    },
});
