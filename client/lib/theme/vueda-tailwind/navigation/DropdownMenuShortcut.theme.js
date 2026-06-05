/**
 * @module theme/vueda-tailwind/navigation/DropdownMenuShortcut.theme
 *
 * Per-component theme registration for DropdownMenuShortcut. Imported as a side effect by
 * DropdownMenuShortcut.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DropdownMenuShortcut styles keyboard shortcut hints aligned inside dropdown menu items.
     */
    DropdownMenuShortcut: {
        /** Trailing keyboard hint with mono micro type so shortcuts scan independently from item labels. */
        root: {
            class: "text-muted-foreground ml-auto font-mono text-[length:var(--vueda-text-micro)] font-medium leading-none",
        },
    },
});
