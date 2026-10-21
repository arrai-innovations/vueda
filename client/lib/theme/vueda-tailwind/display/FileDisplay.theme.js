/**
 * @module theme/vueda-tailwind/display/FileDisplay.theme
 *
 * Per-component theme registration for FileDisplay. Imported as a side effect by
 * FileDisplay.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/theme/vueda-tailwind/registry.js";

patchTheme({
    /**
     * FileDisplay presents a stored file as a link labelled with its name, with a dash for a
     * null or absent value.
     */
    FileDisplay: {
        /** Wrapper around the link; unstyled so it inherits the row's text rhythm. */
        root: {
            class: "",
        },
        /**
         * The file link uses the same inline-text recipe as {@api theme-key:_ButtonLink}: `--primary-text`
         * with an underline on hover. `break-all` stops a long file name from widening the row.
         */
        link: {
            class: "text-primary-text underline-offset-4 hover:underline break-all",
        },
        /** A file name that has no URL to link to, shown as plain text. */
        name: {
            class: "break-all",
        },
        /** Empty-value dash slot, matching DateTimeDisplay so the two read the same. */
        dash: {
            class: "",
        },
    },
});
