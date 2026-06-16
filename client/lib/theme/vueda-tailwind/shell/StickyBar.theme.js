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
         * The visible sticky-bar surface. It uses a card fill (overridable per instance via the
         * `--vueda-sticky-bar-surface` custom property), a bottom divider, and wrapping row layout
         * for primary and secondary controls. The surface is the single strip chrome: callers that
         * pass a `:class` to the StickyBar root (e.g. {@api theme-key:ViewList.filterGroupBar}) set
         * the surface custom property rather than painting a competing background, so the bar never
         * double-wraps a nested padded surface.
         */
        inner: {
            class: [
                // Surface and spacing. Background defaults to `--card`; a wrapper sets
                // `--vueda-sticky-bar-surface` to retint the strip without class clobbering.
                "bg-[var(--vueda-sticky-bar-surface,var(--card))] border-b px-5 py-[10px]",

                // Layout.
                "flex items-center flex-wrap gap-2",
            ],
        },
        /**
         * The primary control cluster inside the sticky bar. It wraps compact action buttons and pushes secondary content to the far side.
         */
        primary: {
            class: [
                // Layout and spacing.
                "flex flex-wrap gap-1.5 mr-auto",
            ],
        },
        /**
         * The secondary control cluster inside the sticky bar. It keeps trailing controls aligned while allowing them to wrap on narrow widths.
         */
        secondary: {
            class: [
                // Layout and spacing.
                "flex flex-wrap gap-1.5 items-center",
            ],
        },
        /**
         * The dirty-state badge inside the sticky bar. It uses primary tint, uppercase micro text, and pill radius to read as transient state rather than a command.
         */
        dirty: {
            class: [
                // Layout.
                "inline-flex items-center justify-center",

                // Sizing and shape.
                "h-[22px] px-2 rounded-full",

                // Surface and color.
                "bg-primary/[0.12] text-primary",

                // Type.
                "text-[10px] font-semibold uppercase tracking-[0.06em] leading-none",
            ],
        },
    },
});
