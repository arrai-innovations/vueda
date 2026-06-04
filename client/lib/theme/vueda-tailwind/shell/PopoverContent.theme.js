/**
 * @module theme/vueda-tailwind/shell/PopoverContent.theme
 *
 * Per-component theme registration for PopoverContent. Imported as a side effect by
 * PopoverContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the PopoverContent slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * PopoverContent styles positioned floating content opened by a popover trigger.
     */
    PopoverContent: {
        /**
         * The positioned popover panel. It uses the shared floating surface recipe and size-driven width and padding tiers.
         */
        root: ({ size }) => {
            const sizeClass = size === "sm" ? "w-60 p-3" : size === "lg" ? "w-90 p-5" : "w-72 p-4";
            return {
                class: [
                    "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 rounded-vueda-control border shadow-vueda-popover origin-(--reka-popover-content-transform-origin) outline-hidden",
                    sizeClass,
                ],
            };
        },
    },
});
