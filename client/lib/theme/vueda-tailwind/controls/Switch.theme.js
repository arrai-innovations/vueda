/**
 * @module theme/vueda-tailwind/controls/Switch.theme
 *
 * Per-component theme registration for Switch. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Sliding boolean control. Tighter than the iOS-canonical size: 18px
     * track / 16px thumb. Checked state fills with `--primary`.
     */
    Switch: {
        /** The track of the sliding boolean control. Tighter than the iOS-canonical size: 18.4px tall (`h-[1.15rem]`), 32px wide (`w-8`), so the switch sits at the form density tier rather than ballooning above the 32px control row. Pill radius; checked fills `--primary`, unchecked fills `--input` (with a darker `--input/80` tint in dark mode for visibility against the deeper canvas). Focus paints `--ring` directly on the otherwise-transparent 1px border and adds a 2px outline at 2px offset, rather than the canon `focus-ring` utility, because the track + thumb composition needs the ring to wrap the entire pill without the inset shadow variant interfering with the thumb's transform. */
        root: {
            class: [
                // State colors and focus ring.
                "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:data-[state=unchecked]:bg-input/80",

                // Track shape and disabled state.
                "inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-vueda-control transition-all disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
        /** The sliding indicator inside {@api theme-key:Switch.root}. 16px circle (`size-4`) sized to fit inside the 18.4px track with a 1.2px gap on each axis; `translate-x-[calc(100%-2px)]` shifts the thumb the track width on checked state and parks it 2px in from the trailing edge so a hairline of track stays visible. Fill flips by palette: `bg-background` on light, `bg-foreground` (unchecked) or `bg-primary-foreground` (checked) on dark, so the thumb reads opposite the track tone in both palettes. `transition-transform` because only the position animates; the fill flip is instant to stay aligned with the track's state change. */
        thumb: {
            class: [
                // Thumb colors.
                "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground",

                // Shape and motion.
                "pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0",
            ],
        },
    },
});
