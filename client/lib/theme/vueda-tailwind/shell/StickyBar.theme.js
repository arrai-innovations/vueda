/**
 * @module theme/vueda-tailwind/shell/StickyBar.theme
 *
 * Per-component theme registration for StickyBar. Imported as a side effect by
 * StickyBar.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * StickyBar styles a persistent action bar that can hide or reveal while staying anchored.
     */
    StickyBar: {
        /**
         * The sticky action-bar wrapper. It stays anchored just above the page edge and translates out of view when `hidden` is true.
         */
        root: ({ hidden }) => {
            return {
                class: {
                    "sticky top-[-1px] z-30": true,
                    "transition-transform duration-300 ease-in-out transform": true,
                    "translate-y-[-100%]": hidden,
                    "translate-y-0": !hidden,
                },
            };
        },
        /**
         * The visible sticky-bar surface. It uses card fill, a bottom divider, and wrapping row layout for primary and secondary controls.
         */
        inner: {
            class: ["bg-card border-b border-border px-5 py-[10px] flex items-center flex-wrap gap-2"],
        },
        /**
         * The primary control cluster inside the sticky bar. It wraps compact action buttons and pushes secondary content to the far side.
         */
        primary: {
            class: ["flex flex-wrap gap-1.5 mr-auto"],
        },
        /**
         * The secondary control cluster inside the sticky bar. It keeps trailing controls aligned while allowing them to wrap on narrow widths.
         */
        secondary: {
            class: ["flex flex-wrap gap-1.5 items-center"],
        },
        /**
         * The dirty-state badge inside the sticky bar. It uses primary tint, uppercase micro text, and pill radius to read as transient state rather than a command.
         */
        dirty: {
            class: [
                "inline-flex items-center justify-center",
                "h-[22px] px-2 rounded-full",
                "bg-primary/[0.12] text-primary",
                "text-[10px] font-semibold uppercase tracking-[0.06em] leading-none",
            ],
        },
        /**
         * The fade below the sticky bar. It protects content immediately under the fixed chrome without adding a separate card surface.
         */
        gradient: {
            class: ["w-full h-3", "bg-gradient-to-b from-card to-transparent"],
        },
    },
});
