/**
 * @module theme/vueda-tailwind/views/ViewDestroy.theme
 *
 * Per-component theme registration for ViewDestroy. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import "./_ActionBannerPrimitives.theme.js";
import { patchTheme } from "@vueda/theme/vueda-tailwind/registry.js";

patchTheme({
    /**
     * ViewDestroy wraps destructive model actions in danger-toned confirmation
     * chrome before delegating the actual form controls.
     */
    ViewDestroy: {
        /** Outer wrapper. Empty; the embedded {@api theme-key:ModelActionForm} renders the page in its danger tone: the sticky action bar, the gutter, and the selected-records panel. */
        root: {
            class: [],
        },
        /** Unframed banner row at the top of the page body: the destructive icon tile beside the title and the description or cascade list. Matches {@api theme-key:ModelActionForm.banner} on a page. */
        banner: {
            class: ["flex items-start gap-3"],
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
    },
});
