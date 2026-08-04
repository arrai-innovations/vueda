/**
 * @module theme/vueda-tailwind/widgets/WidgetFile.theme
 *
 * Per-component theme registration for WidgetFile. Imported as a side effect by
 * WidgetFile.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * File widget for existing file links and file-related actions. Provides
     * the vertical wrapper, file row, truncated link, and action button group.
     */
    WidgetFile: {
        /** The root stays transparent so the field shell provides the surface. */
        root: {
            class: [],
        },
        /** The inner column stacks the current file row with any file controls. */
        inner: {
            class: ["flex flex-col"],
        },
        /** The file row wraps metadata and actions without forcing horizontal overflow. */
        file: {
            class: ["flex flex-wrap justify-between"],
        },
        /** The file link is emphasized and truncated to keep long filenames inside the row. */
        link: {
            class: ["font-semibold text-ellipsis max-w-60 whitespace-nowrap overflow-hidden"],
        },
        /** The action group spaces file commands as separate controls. */
        buttonGroup: {
            class: ["flex gap-4"],
        },
    },
});
