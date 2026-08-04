/**
 * @module theme/vueda-tailwind/shell/StepperItem.theme
 *
 * Per-component theme registration for StepperItem. Imported as a side effect by
 * StepperItem.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * StepperItem styles an individual step and its connector context.
     */
    StepperItem: {
        /**
         * The wrapper for one step and its connector context. It opens the state group used by indicator and separator slots and suppresses pointer events when disabled.
         */
        root: {
            class: "flex items-center gap-2 group data-[disabled]:pointer-events-none",
        },
    },
});
