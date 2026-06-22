/**
 * @module theme/vueda-tailwind/shell/StepperSeparator.theme
 *
 * Per-component theme registration for StepperSeparator. Imported as a side effect by
 * StepperSeparator.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * StepperSeparator styles the connector line between steps.
     */
    StepperSeparator: {
        /**
         * The connector line between steps. It stays muted for upcoming or disabled steps and switches to accent after completion.
         */
        root: {
            class: [
                // Layout and motion.
                "flex-1 h-0.5 min-w-6 rounded-sm mt-4 transition-colors",

                // Default surface.
                "bg-muted",

                // Disabled state.
                "group-data-[disabled]:bg-muted group-data-[disabled]:opacity-50",

                // Completed state.
                "group-data-[state=completed]:bg-accent",
            ],
        },
    },
});
