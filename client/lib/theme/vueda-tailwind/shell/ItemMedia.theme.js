/**
 * @module theme/vueda-tailwind/shell/ItemMedia.theme
 *
 * Per-component theme registration for ItemMedia. Imported as a side effect by
 * ItemMedia.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the ItemMedia slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ItemMedia styles leading icon, image, or media regions inside an item.
     */
    ItemMedia: {
        /**
         * The leading media region for an item. The `icon` variant creates a 32px bordered tile, the `image` variant creates a 40px cropped image frame, and the default stays transparent.
         */
        root: ({ variant }) => {
            const variantClass =
                variant === "icon"
                    ? "size-8 border rounded-sm bg-muted [&_svg:not([class*='size-'])]:size-4"
                    : variant === "image"
                      ? "size-10 rounded-sm overflow-hidden [&_img]:size-full [&_img]:object-cover"
                      : "bg-transparent";
            return {
                class: [
                    "flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none group-has-[[data-slot=item-description]]/item:translate-y-0.5",
                    variantClass,
                ],
            };
        },
    },
});
