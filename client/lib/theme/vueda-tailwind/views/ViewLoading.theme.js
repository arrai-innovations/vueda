/**
 * @module theme/vueda-tailwind/views/ViewLoading.theme
 *
 * Per-component theme registration for ViewLoading. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ViewLoading presents the route loading state with centered message card
     * content, skeleton, heartbeat, and slow-load messaging slots.
     */
    ViewLoading: {
        /** Centering wrapper that fills the viewport vertically and centers the embedded {@api theme-key:SystemMessageCard} on both axes. The card chassis is fixed-width, so a flex parent is required for it to sit in the middle of an otherwise-empty page. */
        root: {
            class: ["flex min-h-full items-center justify-center p-8"],
        },
        /** 20 px icon classes passed through {@api theme-key:SystemMessageCard} `iconProps` on the normal, non-slow path. Sized to read as a glyph beside the crest label, not as the dominant figure in the card. */
        crest: {
            class: ["w-5 h-5"],
        },
        /** Hourglass icon classes passed through {@api theme-key:SystemMessageCard} `iconProps` once the slow-path tone activates. 18 px so the swap reads as a deliberate state change against the 20 px loading icon it replaces. */
        slowCrest: {
            class: ["text-[18px] leading-none"],
        },
        /** Stacked row inside the card body that holds either the name / context pair (normal path) or the slow title / blurb pair (slow path). 4 px gap so the two lines read as a labelled pair, not as separate paragraphs. */
        bodyRow: {
            class: ["flex flex-col gap-1"],
        },
        /** Primary "what is loading" line on the normal path. 14 px / 600 / foreground; same recipe as banner titles on {@api theme-key:ModelActionForm.bannerTitle} so loading and confirmation surfaces read consistently. */
        bodyRowText: {
            class: ["text-[14px] font-semibold leading-[1.3] text-foreground"],
        },
        /** One-line context beneath the name. 12 px / muted-foreground per the headline / supporting-copy hierarchy. */
        bodyRowSub: {
            class: ["text-[12px] font-normal leading-[1.5] text-muted-foreground"],
        },
        /** Extra classes forwarded to {@api theme-key:LoadingSkeletonGhost}. Empty by default; the skeleton ships its own internal sizing and consumers only override when a specific route wants a different placeholder shape. */
        skeleton: {
            class: [],
        },
        /** Extra classes forwarded to {@api theme-key:LoadingHeartbeatStrip}. Empty by default; the strip carries its own chrome and consumers only override when a specific route wants a different elapsed-time band. */
        heartbeat: {
            class: [],
        },
        /** Slow-path title ("This is taking longer than usual") that replaces {@api theme-key:ViewLoading.bodyRowText} once `elapsedMs >= slowAfterMs`. Same 14 px / 600 / foreground recipe so the swap stays type-stable. */
        slowTitle: {
            class: ["text-[14px] font-semibold leading-[1.3] text-foreground"],
        },
        /** Route-specific explanation rendered beneath the slow-path title when a `slowBlurb` prop is provided. 12 px / muted-foreground; same recipe as the normal-path context line so the body stays the same shape across the tone flip. */
        slowBlurb: {
            class: ["text-[12px] font-normal leading-[1.5] text-muted-foreground"],
        },
    },
});
