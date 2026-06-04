/**
 * @module theme/vueda-tailwind/controls/InputOTPGroup.theme
 *
 * Per-component theme registration for InputOTPGroup. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the InputOTPGroup slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * A run of contiguous InputOTPSlots (e.g. the three digits of a 3-3 split
     * code).
     */
    InputOTPGroup: {
        /** A contiguous run of {@api theme-key:InputOTPSlot.root} cells (e.g. the three digits before and after a `-` in a 3-3 split code). Pure flex row; the visual joining comes from the slots themselves overlapping their hairlines, so a group is just a layout marker that separates one run from the next when a code is split. */
        root: {
            class: ["flex items-center"],
        },
    },
});
