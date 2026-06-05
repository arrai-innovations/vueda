/**
 * @module theme/vueda-tailwind/controls/NumberFieldDecrement.theme
 *
 * Per-component theme registration for NumberFieldDecrement. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Decrement stepper button anchored to the left of NumberFieldInput.
     */
    NumberFieldDecrement: {
        /** The decrement stepper anchored to the left edge of {@api theme-key:NumberFieldInput.root}. Absolutely positioned so the stepper overlays the input rather than competing for row width; `disabled:opacity-20` reads as "at the lower bound" — a stronger fade than the standard 50% control-disabled treatment so a temporarily unusable stepper does not look like a fully disabled field. */
        root: {
            class: ["absolute top-1/2 -translate-y-1/2 left-0 p-3 disabled:cursor-not-allowed disabled:opacity-20"],
        },
    },
});
