/**
 * @module theme/vueda-tailwind/controls/InputOTP.theme
 *
 * Per-component theme registration for InputOTP. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * One-time-password input rendered as a row of fixed-width slots. A single input
     * manages focus; the active character slot is highlighted by the ring.
     */
    InputOTP: {
        /** The container for a row of fixed-width character slots. Owns the focus-ring contract for the active slot: a single `focus-ring` paints around whichever slot carries `data-active=true` (and swaps to destructive on `aria-invalid`), rather than each slot drawing its own ring. This keeps one ring sweeping across the row as the cursor advances. The `group/input-otp` marker lets slots detect the disabled input and use disabled colors without fading the container or separator. Disabled inputs do not paint a focus ring. */
        root: {
            class: [
                "group/input-otp flex items-center gap-2 has-disabled:text-disabled-foreground",
                "not-has-disabled:has-[[data-active=true]]:focus-ring",
                "not-has-disabled:aria-invalid:has-[[data-active=true]]:focus-ring-destructive",
            ],
        },
    },
});
