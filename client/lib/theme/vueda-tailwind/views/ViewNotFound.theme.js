/**
 * @module theme/vueda-tailwind/views/ViewNotFound.theme
 *
 * Per-component theme registration for ViewNotFound. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 *
 * Prototype-phase duplication: this entry mirrors the ViewNotFound slice of
 * views/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ViewNotFound displays the generic missing-route state in a centered
     * system message layout.
     */
    ViewNotFound: {
        /** Centering wrapper around the embedded {@api theme-key:SystemMessageCard}. The card chassis is fixed-width, so a flex parent is required for it to sit in the middle of the viewport. Mirrors {@api theme-key:ViewLoading.root}. */
        root: {
            class: ["flex min-h-full items-center justify-center p-8"],
        },
        /** Explanatory paragraph rendered beneath the crest when the `blurb` slot is not overridden. 13 px / muted-foreground so it reads as supporting copy beside the card title. */
        blurb: {
            class: ["text-[13px] leading-[1.5] text-muted-foreground"],
        },
    },
});
