/**
 * @module theme/vueda-tailwind/shell/Stepper.theme
 *
 * Per-component theme registration for Stepper. Imported as a side effect by
 * Stepper.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Stepper styles the container for sequenced progress or workflow steps.
     */
    Stepper: {
        /**
         * The root flex row for a stepper. It provides only the step gap so orientation and step semantics stay with the composed step items.
         */
        root: {
            class: "flex gap-2",
        },
    },
});
