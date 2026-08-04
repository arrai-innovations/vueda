/**
 * @module theme/vueda-tailwind/display/AspectRatio.theme
 *
 * Per-component theme registration for AspectRatio. Imported as a side effect by
 * AspectRatio.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
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
