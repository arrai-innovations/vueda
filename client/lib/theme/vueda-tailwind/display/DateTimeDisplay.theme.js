/**
 * @module theme/vueda-tailwind/display/DateTimeDisplay.theme
 *
 * Per-component theme registration for DateTimeDisplay. Imported as a side effect by
 * DateTimeDisplay.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DateTimeDisplay presents absolute and relative time text together. It supports inline, stacked, tooltip, and fallback dash layouts.
     */
    DateTimeDisplay: {
        /** Inline time wrapper with baseline spacing for absolute and relative text. */
        root: {
            class: "flex items-center space-x-2",
        },
        /** Single-line layout for compact absolute plus relative date text. */
        inline: {
            class: "whitespace-nowrap",
        },
        /** Stacked layout map for absolute and relative lines when inline space is not available. */
        break: {
            absolute: "whitespace-nowrap",
            relative: "whitespace-nowrap mt-1",
        },
        /** Absolute timestamp segment; use for the precise value. */
        absolute: {
            class: "whitespace-nowrap",
        },
        /** Relative timestamp segment; use for the human-readable offset. */
        relative: {
            class: "whitespace-nowrap",
        },
        /** Help cursor for timestamp text that exposes the companion value in a tooltip. */
        tooltip: {
            class: "cursor-help",
        },
        /** Empty-value dash slot, intentionally unstyled so surrounding text rhythm wins. */
        dash: {
            class: "",
        },
    },
});
