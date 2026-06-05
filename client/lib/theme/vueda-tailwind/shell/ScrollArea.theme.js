/**
 * @module theme/vueda-tailwind/shell/ScrollArea.theme
 *
 * Per-component theme registration for ScrollArea. Imported as a side effect by
 * ScrollArea.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ScrollArea styles custom scroll containers and their focusable viewport.
     */
    ScrollArea: {
        /**
         * The root wrapper for a custom scroll area. It establishes relative positioning for scrollbars without adding surface chrome.
         */
        root: {
            class: "relative",
        },
        /**
         * The focusable viewport inside a scroll area. It inherits the parent radius and exposes a keyboard focus outline around the scrolling region.
         */
        viewport: {
            class: "size-full rounded-[inherit] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        },
    },
});
