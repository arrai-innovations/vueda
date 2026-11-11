/**
 * @module theme/vueda-tailwind/display/UrlDisplay.theme
 *
 * Per-component theme registration for UrlDisplay. Imported as a side effect by
 * UrlDisplay.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/theme/vueda-tailwind/registry.js";

patchTheme({
    /**
     * UrlDisplay presents a URL as a link, with a dash for a null or absent value.
     */
    UrlDisplay: {
        /** Wrapper around the link; unstyled so it inherits the row's text rhythm. */
        root: {
            class: "",
        },
        /**
         * The link uses the same inline-text recipe as {@api theme-key:FileDisplay}: `--primary-text`
         * with an underline on hover. `break-all` stops a long value from widening the row.
         */
        link: {
            class: "text-primary-text underline-offset-4 hover:underline break-all",
        },
        /** A value that cannot become a link, shown as plain text. */
        text: {
            class: "break-all",
        },
        /** Empty-value dash slot, matching FileDisplay so the two read the same. */
        dash: {
            class: "",
        },
    },
});
