/**
 * @module theme/vueda-tailwind/views/ViewDeactivate.theme
 *
 * Per-component theme registration for ViewDeactivate. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 *
 * Prototype-phase duplication: this entry mirrors the ViewDeactivate slice of
 * views/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ViewDeactivate presents the account or object deactivation flow in a
     * centered message-card layout with submit error feedback.
     */
    ViewDeactivate: {
        /** Centering wrapper around the embedded warning-toned {@api theme-key:SystemMessageCard}. The card chassis is fixed-width, so a flex parent is required for it to sit in the middle of the viewport; mirrors {@api theme-key:ViewLoading.root} and the other system-view roots so deactivation reads as a sibling of the missing-route and slow-load surfaces. */
        root: {
            class: ["flex min-h-full items-center justify-center p-8"],
        },
        /** Default suspension-explanation paragraph rendered inside the card body when the `message` slot is not overridden. 13 px / muted-foreground so the copy reads as supporting prose beside the destructive button. Consumer overrides take precedence; the {@api theme-key:ConsequencesBullets} list below covers structured per-impact rows. */
        message: {
            class: ["text-[13px] leading-[1.5] text-muted-foreground"],
        },
        /** Submit-error paragraph shown when the deactivate PATCH fails. 12 px / destructive so the error reads as a tone-flipped sibling of the muted message above, without escalating to a full validation alert recipe (the view holds its own retry rather than blocking via {@api theme-key:ActionForm.validation}). */
        error: {
            class: ["text-[12px] text-destructive leading-[1.5]"],
        },
    },
});
