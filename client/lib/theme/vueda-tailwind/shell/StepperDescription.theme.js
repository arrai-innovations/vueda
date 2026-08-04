/**
 * @module theme/vueda-tailwind/shell/StepperDescription.theme
 *
 * Per-component theme registration for StepperDescription. Imported as a side effect by
 * StepperDescription.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * StepperDescription styles supporting text beneath a step title.
     */
    StepperDescription: {
        /**
         * The supporting text beneath a step title. It uses muted extra-small text for optional detail below the primary label.
         */
        root: {
            class: "text-xs text-muted-foreground",
        },
    },
});
