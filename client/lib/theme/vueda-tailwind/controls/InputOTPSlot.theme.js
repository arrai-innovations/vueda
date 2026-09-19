/**
 * @module theme/vueda-tailwind/controls/InputOTPSlot.theme
 *
 * Per-component theme registration for InputOTPSlot. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Individual character cell inside an InputOTPGroup. Borders join into a
     * single hairline across the run; the active slot is outlined by the ring.
     */
    InputOTPSlot: {
        /** A single character cell. Borders use `--input` at the `border-hairline` width, and every non-first slot pulls left by exactly `--vueda-hairline-width` so adjacent slots overlap one device pixel and read as one painted line rather than doubling at the seam. The active slot promotes `z-10` and swaps to `border-ring` so the run's active position outlines cleanly above its neighbours; `aria-invalid` swaps the border to `--destructive` on the same rule. First / last children round only their outer corners so the run reads as one chip. When the containing OTP input is disabled, slots use `--disabled` fill, `--disabled-foreground` ink, and `--border` edges with no shadow, including active or invalid slots. */
        root: {
            class: [
                // Surface, sizing, and joining.
                "dark:bg-input/30 border-hairline border-input relative flex h-vueda-control w-vueda-control items-center justify-center text-sm shadow-vueda-control transition-all",
                "first:rounded-l-md last:rounded-r-md [&:not(:first-child)]:[margin-left:calc(-1*var(--vueda-hairline-width))]",

                // The native input is a sibling of the visible slots inside InputOTP.
                "group-has-disabled/input-otp:!bg-disabled group-has-disabled/input-otp:!text-disabled-foreground group-has-disabled/input-otp:!border-border group-has-disabled/input-otp:shadow-none",

                // Active and invalid states.
                "data-[active=true]:z-10 data-[active=true]:border-ring aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive",
            ],
        },
    },
});
