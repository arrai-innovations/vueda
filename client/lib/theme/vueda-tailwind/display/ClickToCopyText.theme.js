/**
 * @module theme/vueda-tailwind/display/ClickToCopyText.theme
 *
 * Per-component theme registration for ClickToCopyText. Imported as a side effect by
 * ClickToCopyText.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ClickToCopyText lays out copyable text with its affordance on the same baseline. It is used for compact read-only values that can be copied.
     */
    ClickToCopyText: {
        /** Baseline row for a compact read-only value and its copy affordance. */
        root: {
            class: "flex flex-row items-baseline gap-1 p-1 2xs:p-2 2xl:p-4 ",
        },
    },
});
