/**
 * @module theme/vueda-tailwind/navigation/DropdownMenuLabel.theme
 *
 * Per-component theme registration for DropdownMenuLabel. Imported as a side effect by
 * DropdownMenuLabel.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DropdownMenuLabel styles a non-interactive label for a group of dropdown menu items.
     */
    DropdownMenuLabel: {
        /** Non-interactive group label using the mono micro uppercase recipe. */
        root: {
            class: [
                // Surface and spacing.
                "text-muted-foreground px-2 py-1.5",

                // Type.
                "font-mono text-[length:var(--vueda-text-micro)] font-semibold leading-none tracking-[0.04em] uppercase",

                // Data attribute states.
                "data-[inset]:pl-8",
            ],
        },
    },
});
