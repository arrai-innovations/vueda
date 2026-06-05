/**
 * @module theme/vueda-tailwind/shell/TabsList.theme
 *
 * Per-component theme registration for TabsList. Imported as a side effect by
 * TabsList.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * TabsList styles the segmented control that contains tab triggers.
     */
    TabsList: {
        /**
         * The segmented tab-list surface. It uses muted fill, compact height, and a small internal padding so active triggers read as selected slabs.
         */
        root: {
            class: "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        },
    },
});
