/**
 * @module theme/vueda-tailwind/views/ViewTwoFactorAuth.theme
 *
 * Per-component theme registration for ViewTwoFactorAuth. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ViewTwoFactorAuth styles the two-factor authentication challenge,
     * recovery-code toggle, verification input, and cooldown indicator.
     */
    ViewTwoFactorAuth: {
        /** Outer wrapper. Empty; the embedded {@api theme-key:AuthorizingForm} owns the framed card and viewport-centred chrome, so this key is left open as the consumer-facing override surface. */
        root: {
            class: [],
        },
        /** Vertical button stack inside the {@api theme-key:AuthorizingForm}'s `action-bar` slot. Stacks the resend / verify / recovery-toggle trio in a single column with 8 px gaps and a 16 px top inset so the cluster reads as a footer beneath the method picker and OTP grid. */
        buttons: {
            class: ["flex flex-col gap-2 pt-4"],
        },
        /** Ghost CTA that flips the form body between verified-method mode and recovery-code mode. `self-start` anchors the button to the start of the column so it reads as an escape hatch beside the primary verify CTA, not a peer of it. */
        recoveryToggle: {
            class: ["self-start"],
        },
        /** Class forwarded to the `WidgetTextInput` rendered for the recovery-code path. Mono with a small letter-spacing bump so the dashed code reads as machine-input alongside the OTP grid it replaces. */
        recoveryInput: {
            class: ["font-mono tracking-[0.04em]"],
        },
        /** Inline cooldown pill beside the resend button while the 60-second send-code cooldown is active. Mono / 11 px / `tabular-nums` keeps the counting digits column-aligned as the seconds tick down; muted fill + muted-foreground keep the pill from competing with the disabled resend button it sits beside. The chip is announced via `aria-live="polite"` on the consumer side; this recipe handles visual chrome only. */
        cooldownChip: {
            class: [
                "inline-flex items-center justify-center px-2 py-0.5 rounded-full",
                "bg-muted/70 text-muted-foreground",
                "font-mono text-[11px] font-medium leading-none tabular-nums",
            ],
        },
    },
});
