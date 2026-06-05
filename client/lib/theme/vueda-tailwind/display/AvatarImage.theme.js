/**
 * @module theme/vueda-tailwind/display/AvatarImage.theme
 *
 * Per-component theme registration for AvatarImage. Imported as a side effect by
 * AvatarImage.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * AvatarImage fills the avatar frame with an image. It preserves a square media box inside the rounded container.
     */
    AvatarImage: {
        /** Square image fill that inherits clipping from {@api theme-key:Avatar.root}. */
        root: {
            class: "aspect-square size-full",
        },
    },
});
