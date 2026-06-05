/**
 * @module theme/vueda-tailwind/views/ViewActionNotFound.theme
 *
 * Per-component theme registration for ViewActionNotFound. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ViewActionNotFound displays the missing-action state for a model view
     * when the requested action cannot be resolved.
     */
    ViewActionNotFound: {
        /** Centering wrapper around the embedded {@api theme-key:SystemMessageCard}. See {@api theme-key:ViewNotFound.root}; the two views share the recipe so missing-route and missing-action surfaces read as siblings. */
        root: {
            class: ["flex min-h-full items-center justify-center p-8"],
        },
        /** Explanatory paragraph rendered beneath the crest when the `blurb` slot is not overridden. 13 px / muted-foreground; matches {@api theme-key:ViewNotFound.blurb}. */
        blurb: {
            class: ["text-[13px] leading-[1.5] text-muted-foreground"],
        },
    },
});
