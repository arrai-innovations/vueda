/**
 * @module theme/vueda-tailwind/views/ViewDeactivate.theme
 *
 * Per-component theme registration for ViewDeactivate. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ViewDeactivate is the outer theme entry for deactivation flows that share the
     * generic view-action structure.
     */
    ViewDeactivate: {
        /** Outer wrapper around the embedded {@api theme-key:PageTitle} and the deactivate-flow {@api theme-key:ModelActionForm}. Empty by default; the chrome lives on the inner shells. The view also renders a centred `LoadingSpinnerBlock` while {@api theme-key:ModelActionForm}'s model config loads; that fallback inherits its own block recipe and is not themed here. */
        root: {
            class: [],
        },
    },
});
