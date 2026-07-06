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
     * DropdownMenuShortcut aligns keyboard shortcut keycaps inside dropdown menu items.
     */
    DropdownMenuShortcut: {
        /** Alignment wrapper for the trailing keyboard hint. The nested {@api theme-key:Kbd.root} owns the visible keycap. */
        root: {
            class: "ml-auto inline-flex items-center pl-2",
        },
        /** Local sizing for the nested {@api theme-key:Kbd.root} inside menu rows. */
        kbd: {
            class: "h-[18px] min-w-[18px] px-1 text-[10px]",
        },
    },
});
