/**
 * @module theme/vueda-tailwind/shell/StepperIndicator.theme
 *
 * Per-component theme registration for StepperIndicator. Imported as a side effect by
 * StepperIndicator.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * StepperIndicator styles the circular marker that communicates step state.
     */
    StepperIndicator: {
        /**
         * The circular step marker. It maps active, completed, disabled, and upcoming states to the stepper color contract.
         */
        root: {
            class: [
                "inline-flex items-center justify-center rounded-full text-muted-foreground/50 w-8 h-8",
                "group-data-[disabled]:text-muted-foreground group-data-[disabled]:opacity-50",
                "group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground",
                "group-data-[state=completed]:bg-accent group-data-[state=completed]:text-accent-foreground",
            ],
        },
    },
});
