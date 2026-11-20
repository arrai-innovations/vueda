/**
 * @module theme/vueda-tailwind/objects-grid/ColumnModelLinks.theme
 *
 * Per-component theme registration for ColumnModelLinks. Imported as a side
 * effect by ColumnModelLinks.vue, so a route chunk that pulls only that SFC
 * drags only this component's theme entry, not the entire objects-grid family.
 */
import { patchTheme } from "@vueda/theme/vueda-tailwind/registry.js";

patchTheme({
    /**
     * ColumnModelLinks styles a to-many list cell: comma-separated related labels, a "+N more"
     * button, and a popover that lists the remaining labels.
     */
    ColumnModelLinks: {
        /** The cell content. It holds either the labels and the "+N more" button, or the count of related objects. */
        root: {
            class: ["break-words"],
        },
        /** The "+N more" button. The left margin separates it from the last visible label. */
        more: {
            class: ["ml-1"],
        },
        /** The popover panel. Its height is capped, and a long list scrolls inside it. */
        popover: {
            class: ["max-w-80", "max-h-80", "overflow-y-auto"],
        },
        /** The list of remaining labels inside the popover, one label per line. */
        list: {
            class: ["flex", "flex-col", "gap-1"],
        },
    },
});
