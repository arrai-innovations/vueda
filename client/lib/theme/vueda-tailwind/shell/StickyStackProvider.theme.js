/**
 * @module theme/vueda-tailwind/shell/StickyStackProvider.theme
 *
 * Per-component theme registration for StickyStackProvider. Imported as a side
 * effect by StickyStackProvider.vue, so a route chunk that pulls only that SFC
 * drags only this component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * StickyStackProvider hosts the framework-owned sticky chrome zones. It wraps the scrolling
     * region (the window scrolls; the provider introduces no `overflow`) and pins a top zone to the
     * top of the viewport and a bottom zone to the bottom. Each zone is a single sticky wrapper, so
     * its slotted and teleported chrome stacks in normal flow with no height math.
     */
    StickyStackProvider: {
        /**
         * Structural wrapper around the top zone, the scrolling content, and the bottom zone. Lays
         * them out in a column and introduces no `overflow`, so `position: sticky` on the zones pins
         * to the window. It also carries the `--vueda-sticky-stack-top` custom property (set inline
         * from the measured top-zone height) for descendants such as the grid header to consume.
         */
        root: {
            class: ["flex flex-col"],
        },
        /**
         * The top sticky zone, pinned to the top of the scroll viewport. Holds the page title
         * (placed via the `top` slot) and any action chrome teleported in by the active view, and
         * translates out of view when `topHidden` is true. Carries an opaque background so scrolling
         * content does not bleed through; child chrome supplies its own borders.
         */
        topZone: ({ topHidden }) => ({
            class: {
                "sticky top-0 z-30": true,
                "flex flex-col": true,
                "bg-background": true,
                "transition-transform duration-300 ease-in-out transform": true,
                "translate-y-[-100%]": topHidden,
                "translate-y-0": !topHidden,
            },
        }),
        /**
         * The bottom sticky zone, pinned to the bottom of the scroll viewport. Holds chrome
         * teleported in by the active view (typically the pagination footer) and the `bottom` slot.
         * Always shown by default; translates downward out of view when `bottomHidden` is true.
         */
        bottomZone: ({ bottomHidden }) => ({
            class: {
                "sticky bottom-0 z-30": true,
                "flex flex-col": true,
                "bg-background": true,
                "transition-transform duration-300 ease-in-out transform": true,
                "translate-y-[100%]": bottomHidden,
                "translate-y-0": !bottomHidden,
            },
        }),
    },
});
