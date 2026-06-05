/**
 * @module theme/vueda-tailwind/display/Kbd.theme
 *
 * Per-component theme registration for Kbd. Imported as a side effect by
 * Kbd.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Kbd renders a single keyboard key hint. It keeps key labels compact and adjusts contrast when shown inside tooltip content.
     */
    Kbd: {
        /** Single keycap chip for shortcut hints; tooltip nesting adjusts contrast. */
        root: {
            class: [
                "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium select-none",
                "[&_svg:not([class*='size-'])]:size-3",
                "[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
            ],
        },
    },
});
