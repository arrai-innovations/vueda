/**
 * @module theme/vueda-tailwind/views/ViewSetupDevice.theme
 *
 * Per-component theme registration for ViewSetupDevice. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ViewSetupDevice styles the multi-step device setup flow, including step
     * indicators, manual key display, and completion state.
     */
    ViewSetupDevice: {
        /** Horizontal stepper rail above the form body. `mb-4` opens a 16 px gap between the rail and the first field so the progress indicator reads as supporting chrome, not the form's leading row. Used as the `<ol>` element so screen readers see the steps as a list; the consumer supplies `aria-label="Setup progress"`. */
        steps: {
            class: ["flex items-center gap-2 mb-4"],
        },
        /** One entry in the stepper (number badge + label pair). `data-[state=upcoming]:opacity-60` dims future steps so the rail naturally focuses on the active step; the badge and label below carry per-state colour routing for the `current` and `done` tones. */
        step: {
            class: ["flex items-center gap-2", "data-[state=upcoming]:opacity-60"],
        },
        /** 18 px circular badge that holds the step number (or a check glyph at `state=done`). `data-state` routes the fill: neutral hairline + muted-foreground at `upcoming`, solid primary at `current`, and tinted primary/15 with a primary/40 border at `done`. The `aria-hidden="true"` on the consumer side keeps the badge out of the assistive-tech reading order (the {@api theme-key:ViewSetupDevice.stepLabel} carries the actual step name). */
        stepNum: {
            class: [
                "flex items-center justify-center shrink-0",
                "w-[18px] h-[18px] rounded-full",
                "text-[11px] font-semibold leading-none",
                "border bg-background text-muted-foreground",

                // Data attribute states.
                "data-[state=current]:bg-primary",
                "data-[state=current]:text-primary-foreground",
                "data-[state=current]:border-primary",
                "data-[state=done]:bg-primary/15",
                "data-[state=done]:text-primary",
                "data-[state=done]:border-primary/40",
            ],
        },
        /** Step-name label beside the number badge. Uses the 11 px / 600 / `0.06em` uppercase eyebrow recipe so the rail reads as a row of section eyebrows; `data-state` promotes the colour to foreground at `current` and `done` so the active step does not lose contrast against the dimmed `upcoming` peers. */
        stepLabel: {
            class: [
                "text-[11px] font-semibold uppercase tracking-[0.06em] leading-none",
                "text-muted-foreground",
                "data-[state=current]:text-foreground",
                "data-[state=done]:text-foreground",
            ],
        },
        /** 1 px hairline rendered between consecutive step badges. `flex-1` lets the divider claim the remaining row width so all dividers stretch to the same length regardless of label length. */
        stepDivider: {
            class: ["flex-1 h-px bg-border"],
        },
        /** Manual-key strip rendered beneath the TOTP QR code so the operator can transcribe the secret when scanning is not an option. Card-toned with a hairline border and 10 px vertical padding; sits one row below the QR with a 8 px top inset so the two read as a pair. */
        manualKey: {
            class: ["flex items-center gap-2 px-3 py-[10px] mt-2", "rounded-vueda-control border bg-background"],
        },
        /** "Manual key" eyebrow inside the strip. 10 px / 600 / `0.06em` uppercase, one tier smaller than the page-level eyebrows so it reads as a strip-local label; `shrink-0` keeps the eyebrow from collapsing when the secret pushes wider than the row. */
        manualKeyLabel: {
            class: [
                "text-[10px] font-semibold uppercase tracking-[0.06em] leading-none",
                "text-muted-foreground shrink-0",
            ],
        },
        /** Mono secret fragment inside the strip. 12.5 px / 500 / mono; `select-all` makes a triple-click copy the whole secret, and `truncate min-w-0 flex-1` ellipsizes the tail when the row is narrower than the secret rather than wrapping a base32 string mid-token. */
        manualKeyValue: {
            class: [
                "font-mono text-[12.5px] font-medium leading-none",
                "text-foreground select-all truncate min-w-0 flex-1",
            ],
        },
        /** Completion-state body that replaces the form fields once the device is verified. Centered column with 12 px gaps and 24 px vertical padding so the celebratory icon / title / description trio reads as a deliberate end-of-flow surface, not another form row. */
        done: {
            class: ["flex flex-col items-center text-center gap-3 py-6"],
        },
        /** 48 px circular icon tile leading the completion body (typically a check glyph). Primary/15 fill on primary keeps the tile from reading as destructive while still signalling "success" in the brand accent; sized larger than the {@api theme-key:ModelActionForm.bannerIcon} 36 px tile so completion reads as a celebratory surface rather than another banner row. */
        doneIcon: {
            class: [
                "flex items-center justify-center",
                "w-12 h-12 rounded-full bg-primary/15 text-primary",
                "text-[24px] leading-none",
            ],
        },
        /** Completion title ("Device added" or similar). 16 px / 600 / foreground, one tier above the banner-title recipe on {@api theme-key:ModelActionForm.bannerTitle} so the end-of-flow headline reads with more weight than the per-banner titles encountered along the way. */
        doneTitle: {
            class: ["text-[16px] font-semibold leading-[1.3] text-foreground"],
        },
        /** Completion description beneath the title ("Your two-factor device is now active…"). 13 px / muted-foreground capped at 44ch so the explanation reads as a paragraph; one tier larger than the 12 px banner-desc recipe to match the bumped 16 px title above. */
        doneDescription: {
            class: ["text-[13px] font-normal leading-[1.5] text-muted-foreground max-w-[44ch]"],
        },
        /** Action cluster beneath the completion description. `mt-2` opens a 8 px inset so the actions sit one rhythm-step below the description rather than crowding it. */
        doneActions: {
            class: ["flex gap-2 mt-2"],
        },
    },
});
