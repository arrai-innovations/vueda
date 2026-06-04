/**
 * @module theme/vueda-tailwind/views/ViewActivate.theme
 *
 * Per-component theme registration for ViewActivate. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 *
 * Prototype-phase duplication: this entry mirrors the ViewActivate slice of
 * views/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ViewActivate is the outer theme entry for activation flows that share the
     * generic view-action structure.
     */
    ViewActivate: {
        /** Outer wrapper around the embedded {@api theme-key:PageTitle} and the activate-flow {@api theme-key:ModelActionForm}. Empty by default; the chrome lives on the inner shells. The view also renders a centred `LoadingSpinnerBlock` while {@api theme-key:ModelActionForm}'s model config loads; that fallback inherits its own block recipe and is not themed here. */
        root: {
            class: [],
        },
    },
});
