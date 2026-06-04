/**
 * @module theme/vueda-tailwind/display/AvatarImage.theme
 *
 * Per-component theme registration for AvatarImage. Imported as a side effect by
 * AvatarImage.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 *
 * Prototype-phase duplication: this entry mirrors the AvatarImage slice of
 * display/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
