/**
 * @module theme/vueda-tailwind/display/AspectRatio.theme
 *
 * Per-component theme registration for AspectRatio. Imported as a side effect by
 * AspectRatio.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 *
 * Prototype-phase duplication: this entry mirrors the AspectRatio slice of
 * display/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AspectRatio wraps content in a fixed-ratio layout box. It carries no default classes because sizing is supplied by the primitive and caller.
     */
    AspectRatio: {
        /** Empty pass-through wrapper for ratio-bound media; sizing comes from the primitive and caller. */
        root: { class: "" },
    },
});
