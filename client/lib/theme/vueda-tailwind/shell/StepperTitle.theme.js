/**
 * @module theme/vueda-tailwind/shell/StepperTitle.theme
 *
 * Per-component theme registration for StepperTitle. Imported as a side effect by
 * StepperTitle.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * StepperTitle styles the label for a step.
     */
    StepperTitle: {
        /**
         * The primary label for a step. It stays on one line so horizontal steppers do not shift as labels wrap.
         */
        root: {
            class: "text-md font-semibold whitespace-nowrap",
        },
    },
});
