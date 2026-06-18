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
     * StickyStackProvider hosts the framework-owned sticky chrome stack. It wraps the scrolling
     * region (the window scrolls; the provider introduces no `overflow`) and lays out an ordered
     * stack of independently-revealing bars pinned to the top and bottom of the viewport. Each bar's
     * sticky offset, hide transform, and stacking order are computed and applied inline; this theme
     * supplies only the shared, static surface chrome.
     */
    StickyStackProvider: {
        /**
         * Structural wrapper around the bars and the scrolling content. Lays them out in a column and
         * introduces no `overflow`, so the bars (its direct children) pin relative to the window. It
         * also carries the `--vueda-sticky-stack-top` custom property (set inline from the visible
         * top-stack height) for descendants such as a sticky grid header to consume.
         */
        root: {
            class: ["flex flex-col"],
        },
        /**
         * A single sticky bar in the stack (the title, the bottom slot, or a view's teleported
         * chrome). Pins to the viewport edge; its `top`/`bottom`, hide transform, and stacking order
         * are applied inline by the component. Carries an opaque background so scrolling content does
         * not bleed through, and transitions only its transform (so a bar slides smoothly as it hides
         * and the survivors compact). Child chrome supplies its own borders and padding.
         */
        bar: {
            class: ["sticky", "flex flex-col", "bg-background", "transition-transform duration-300 ease-in-out"],
        },
    },
});
