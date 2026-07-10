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
                // Surface and layout.
                "hairline hairline-border bg-muted text-muted-foreground",
                "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1",

                // Shape and type.
                "rounded-vueda-checkbox px-1 font-mono text-[length:var(--vueda-text-micro)] leading-[1.25] font-semibold select-none",

                // Icons and nested surfaces.
                "[&_svg:not([class*='size-'])]:size-3",
                "[[data-slot=tooltip-content]_&]:[--vueda-hairline-color:color-mix(in_oklab,var(--background)_20%,transparent)]",
                "[[data-slot=tooltip-content]_&]:bg-background/20",
                "[[data-slot=tooltip-content]_&]:text-background",
                "dark:[[data-slot=tooltip-content]_&]:bg-background/10",
            ],
        },
    },
});
