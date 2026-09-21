/**
 * @module theme/vueda-tailwind/display/BooleanDisplay.theme
 *
 * Per-component theme registration for BooleanDisplay. Imported as a side effect by
 * BooleanDisplay.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * BooleanDisplay presents a boolean as a word, with a dash for a null or absent value.
     */
    BooleanDisplay: {
        /** Wrapper around the word; unstyled so it inherits the row's text rhythm. */
        root: {
            class: "",
        },
        /** The word itself, for a skin that wants to tint or weight a yes against a no. */
        value: {
            class: "",
        },
        /** Empty-value dash slot, matching DateTimeDisplay so the two read the same. */
        dash: {
            class: "",
        },
    },
});
