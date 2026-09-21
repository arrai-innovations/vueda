/**
 * @module theme/vueda-tailwind/display/DurationDisplay.theme
 *
 * Per-component theme registration for DurationDisplay. Imported as a side effect by
 * DurationDisplay.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DurationDisplay presents a duration in named units, with a dash for a null or absent value.
     */
    DurationDisplay: {
        /** Wrapper around the units; unstyled so it inherits the row's text rhythm. */
        root: {
            class: "",
        },
        /** The unit text itself, for a skin that wants to tint or weight a duration. */
        value: {
            class: "",
        },
        /** Empty-value dash slot, matching DateTimeDisplay so the two read the same. */
        dash: {
            class: "",
        },
    },
});
