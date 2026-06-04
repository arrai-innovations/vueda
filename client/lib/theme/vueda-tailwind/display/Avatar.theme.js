/**
 * @module theme/vueda-tailwind/display/Avatar.theme
 *
 * Per-component theme registration for Avatar. Imported as a side effect by
 * Avatar.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 *
 * Prototype-phase duplication: this entry mirrors the Avatar slice of
 * display/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Avatar provides the circular media frame used by image and fallback avatar parts. It clips child content to the avatar shape.
     */
    Avatar: {
        /** Circular clipping frame shared by avatar image and fallback content. */
        root: {
            class: "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        },
    },
});
