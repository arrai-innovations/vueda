/**
 * @module theme/vueda-tailwind/display/JsonDisplay.theme
 *
 * Per-component theme registration for JsonDisplay. Imported as a side effect by
 * JsonDisplay.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * JsonDisplay presents a `JSON` value as formatted text, with a dash for a null or
     * absent value. The root is a `pre` in the block form and a `span` with `data-inline`
     * in the inline one, so one recipe covers both and selects on that attribute.
     */
    JsonDisplay: {
        /**
         * Mono, per the data-font rule: a payload is machine-generated and its nesting
         * depends on stable character widths. Size and leading are inherited rather than
         * set, so a read row keeps its own rhythm and a grid cell still follows
         * `data-density`. `whitespace-pre-wrap` keeps the block form's indentation while
         * still wrapping a long string value, and `break-words` stops an unbroken token
         * (a URL, a hash) from widening the row. The inline form carries `data-inline`,
         * which returns it to normal whitespace: it has no indentation to preserve, and a
         * table cell should collapse runs of space like any other cell.
         */
        root: {
            class: ["font-mono break-words", "whitespace-pre-wrap data-[inline=true]:whitespace-normal"],
        },
        /** The text itself, for a skin that wants to tint or size a payload. */
        value: {
            class: "",
        },
        /** Empty-value dash slot, matching DateTimeDisplay so the two read the same. */
        dash: {
            class: "",
        },
    },
});
