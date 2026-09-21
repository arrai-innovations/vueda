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
        /** The container for character groups and separators. The `group/input-otp` marker lets visible slots read invalid and disabled state from the native input. Each active slot owns its focus ring. Disabled inputs use disabled text colors without fading the container or separator. */
        root: {
            class: "group/input-otp flex items-center gap-2 has-disabled:text-disabled-foreground",
        },
    },
});
