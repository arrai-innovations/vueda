/**
 * @module theme/vueda-tailwind/display/DateRangeDisplay.theme
 *
 * Per-component theme registration for DateRangeDisplay. Imported as a side effect by
 * DateRangeDisplay.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DateRangeDisplay formats a start and end date with a stable separator. Its slots keep each date segment individually addressable.
     */
    DateRangeDisplay: {
        /** Inline date-range wrapper that prevents the paired dates and separator from wrapping apart. */
        root: {
            class: "whitespace-nowrap",
        },
        /** Separator text between {@api theme-key:DateRangeDisplay.from} and {@api theme-key:DateRangeDisplay.to}. */
        separator: {
            class: "",
        },
        /** Start-date text segment, kept addressable for range-specific typography or color. */
        from: {
            class: "",
        },
        /** End-date text segment, kept separate from the start date for caller overrides. */
        to: {
            class: "",
        },
    },
});
