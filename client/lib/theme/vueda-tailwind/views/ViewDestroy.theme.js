/**
 * @module theme/vueda-tailwind/views/ViewDestroy.theme
 *
 * Per-component theme registration for ViewDestroy. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import "./_ActionBannerPrimitives.theme.js";
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ViewDestroy wraps destructive model actions in danger-toned confirmation
     * chrome before delegating the actual form controls.
     */
    ViewDestroy: {
        /** Outer wrapper. Empty; the card below owns all visible chrome. */
        root: {
            class: [],
        },
        /** Outer danger card. Opens a `group/view-destroy` named scope, carries a destructive-bordered card with an 8 % destructive ring, and wraps the embedded {@api theme-key:ModelActionForm} in `:bare="true" tone="danger"` so the inner card is suppressed and this surface stays authoritative. */
        card: {
            class: [
                "group/view-destroy",
                "rounded-vueda-card border-hairline bg-card overflow-hidden",
                "border-destructive/50",
                "shadow-[0_0_0_3px_color-mix(in_oklab,var(--destructive)_8%,transparent)]",
            ],
        },
        /** Banner row at the top of the danger card: destructive 6 %-mix background, destructive-tinted bottom hairline. Mirrors the {@api theme-key:ModelActionForm.banner} layout so danger and tone-routed banners read as siblings. */
        banner: {
            composes: ["_ActionBanner.banner"],
            class: ["border-destructive/20 bg-destructive/[0.06]"],
        },
        /** 36 px destructive icon tile leading the banner. Fixed destructive recipe (no tone routing) since ViewDestroy is the danger specialization; matches {@api theme-key:ModelActionForm.bannerIcon} under the danger tone. */
        bannerIcon: {
            composes: ["_ActionBanner.bannerIcon"],
            class: ["bg-destructive text-destructive-foreground"],
        },
        /** Inner column beside the icon: title above description. `min-w-0` lets long titles ellipsize instead of pushing the banner wider. */
        bannerBody: {
            composes: ["_ActionBanner.bannerBody"],
            class: [],
        },
        /** Banner title. 14 px / 600 / foreground; the destructive action's "what is about to happen" headline. */
        bannerTitle: {
            composes: ["_ActionBanner.bannerTitle"],
            class: [],
        },
        /** One-line description beneath the title (typically the `ConsequencesBullets` fallback or its leading sentence). 12 px / muted-foreground per the headline / supporting-copy hierarchy. */
        bannerDescription: {
            composes: ["_ActionBanner.bannerDesc"],
            class: [],
        },
        /** Body region beneath the banner: holds the consequences cascade and the embedded ModelActionForm. 16 px padding so the card edge stays clear of the chip-strip border. */
        body: {
            class: ["p-4"],
        },
    },
});
