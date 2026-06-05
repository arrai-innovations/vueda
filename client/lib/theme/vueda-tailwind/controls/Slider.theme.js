/**
 * @module theme/vueda-tailwind/controls/Slider.theme
 *
 * Per-component theme registration for Slider. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Continuous-value control with a track, range fill, and one or more
     * thumbs. Supports horizontal (default) and vertical orientation.
     */
    Slider: {
        /** The continuous-value control surface. Flex row by default; `data-[orientation=vertical]` flips to flex column and applies a 176px (`min-h-44`) minimum height so a vertical slider has enough travel to be precise. `touch-none` and `select-none` so dragging the {@api theme-key:Slider.thumb} does not scroll the page or initiate a text selection. `data-[disabled]:opacity-50` is the disabled signal; pointer events are blocked at the Reka primitive level above this slot, so no `cursor-not-allowed` is needed on the root. */
        root: {
            class: [
                "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
            ],
        },
        /** The neutral channel that the {@api theme-key:Slider.range} fills against. `bg-muted` so it reads as inert chrome behind the active fill; 6px thick (`h-1.5` horizontal, `w-1.5` vertical) at pill radius so the ends round into the {@api theme-key:Slider.thumb}. `overflow-hidden` clips the range fill to the rounded ends so the active portion meets the track corners cleanly. */
        track: {
            class: [
                "bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
            ],
        },
        /** The active fill between the track origin and the current {@api theme-key:Slider.thumb} position. `bg-primary` makes the slider's selected portion read as the same selection tone as the rest of the form family. Absolutely positioned inside {@api theme-key:Slider.track} and sized 100% on the cross-axis so it always paints the full track thickness regardless of orientation. */
        range: {
            class: ["bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"],
        },
        /** The drag handle painted on top of {@api theme-key:Slider.track}. 16px circle on a white fill with a 1px `--primary` border so the knob reads as tactile and grabbable against any palette. `hover:ring-4` and `focus-visible:ring-4` paint a 4px `--ring/50` halo at the slider's scale, with `outline-hidden` suppressing the default browser focus outline so the halo is the only focus paint; the canon `focus-ring` utility is skipped here because the offset-outline variant would extend outside the track and clip against the surrounding layout. Multiple thumbs render when the model value is an array, giving a two-handle range. */
        thumb: {
            class: [
                "bg-white border-primary ring-ring/50 block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
            ],
        },
    },
});
