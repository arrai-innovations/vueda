/**
 * @module theme/vueda-tailwind/shell/StepperTrigger.theme
 *
 * Per-component theme registration for StepperTrigger. Imported as a side effect by
 * StepperTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * StepperTrigger styles the interactive control for selecting a step.
     */
    StepperTrigger: {
        /**
         * The selectable control for a step. It stacks indicator and label content in a compact centered column with a modest focusable radius.
         */
        root: {
            class: "p-1 flex flex-col items-center text-center gap-1 rounded-md",
        },
    },
});
