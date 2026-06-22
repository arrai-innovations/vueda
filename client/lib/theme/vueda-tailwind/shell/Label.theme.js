/**
 * @module theme/vueda-tailwind/shell/Label.theme
 *
 * Per-component theme registration for Label. Imported as a side effect by
 * Label.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Label styles accessible label text associated with form controls and grouped inputs.
     */
    Label: {
        /**
         * The accessible label text for controls and grouped inputs. It handles disabled states from both group and peer contexts while preserving compact inline alignment.
         */
        root: {
            class: [
                // Layout and type.
                "flex items-center gap-2 text-sm leading-none font-medium select-none",

                // Disabled states.
                "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            ],
        },
    },
});
