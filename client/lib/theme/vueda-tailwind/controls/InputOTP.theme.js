/**
 * @module theme/vueda-tailwind/controls/InputOTP.theme
 *
 * Per-component theme registration for InputOTP. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the InputOTP slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * One-time-password input rendered as a row of fixed-width slots. Slots
     * focus independently; the active slot is highlighted by the ring.
     */
    InputOTP: {
        /** The container for a row of fixed-width character slots. Owns the focus-ring contract for the active slot: a single `focus-ring` paints around whichever slot carries `data-active=true` (and swaps to destructive on `aria-invalid`), rather than each slot drawing its own ring. This keeps one ring sweeping across the row as the cursor advances. */
        root: {
            class: [
                "flex items-center gap-2 has-disabled:opacity-50",
                "has-[[data-active=true]]:focus-ring",
                "aria-invalid:has-[[data-active=true]]:focus-ring-destructive",
            ],
        },
    },
});
