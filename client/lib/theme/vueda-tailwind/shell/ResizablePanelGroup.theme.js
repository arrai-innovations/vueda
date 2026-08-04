/**
 * @module theme/vueda-tailwind/shell/ResizablePanelGroup.theme
 *
 * Per-component theme registration for ResizablePanelGroup. Imported as a side effect by
 * ResizablePanelGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ResizablePanelGroup styles the flex container that holds resizable panels.
     */
    ResizablePanelGroup: {
        /**
         * The flex container for resizable panels. It switches from row to column layout when the panel group orientation is vertical.
         */
        root: {
            class: "flex h-full w-full data-[orientation=vertical]:flex-col",
        },
    },
});
