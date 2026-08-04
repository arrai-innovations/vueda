/**
 * @module theme/vueda-tailwind/display/KbdGroup.theme
 *
 * Per-component theme registration for KbdGroup. Imported as a side effect by
 * KbdGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * KbdGroup aligns multiple keyboard key hints as one shortcut sequence. It keeps adjacent key chips tight without adding its own visual chrome.
     */
    KbdGroup: {
        /** Inline shortcut sequence wrapper that clusters adjacent {@api theme-key:Kbd.root} chips into one chord. */
        root: {
            class: "inline-flex w-fit items-center gap-0.5",
        },
    },
});
