/**
 * @module theme/vueda-tailwind/shell/ScrollBar.theme
 *
 * Per-component theme registration for ScrollBar. Imported as a side effect by
 * ScrollBar.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the ScrollBar slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ScrollBar styles the scrollbar track and thumb for scroll areas.
     */
    ScrollBar: {
        /**
         * The custom scrollbar track. It uses a 10px touch target and switches its border side and dimensions by orientation.
         */
        root: ({ orientation }) => ({
            class: [
                "flex touch-none p-px transition-colors select-none",
                orientation === "horizontal"
                    ? "h-2.5 flex-col border-t border-t-transparent"
                    : "h-full w-2.5 border-l border-l-transparent",
            ],
        }),
        /**
         * The draggable scrollbar thumb. It uses the border token as a quiet neutral fill and rounds fully inside the track.
         */
        thumb: {
            class: "bg-border relative flex-1 rounded-full",
        },
    },
});
