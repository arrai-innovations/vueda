/**
 * @module theme/vueda-tailwind/controls/NumberFieldIncrement.theme
 *
 * Per-component theme registration for NumberFieldIncrement. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Increment stepper button anchored to the right of NumberFieldInput.
     */
    NumberFieldIncrement: {
        /** The increment stepper anchored to the right edge of {@api theme-key:NumberFieldInput.root}. Mirror of {@api theme-key:NumberFieldDecrement.root}; same overlay positioning and same upper-bound fade. */
        root: {
            class: ["absolute top-1/2 -translate-y-1/2 right-0 disabled:cursor-not-allowed disabled:opacity-20 p-3"],
        },
    },
});
