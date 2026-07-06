/**
 * @module theme/vueda-tailwind/navigation/MenubarShortcut.theme
 *
 * Per-component theme registration for MenubarShortcut. Imported as a side effect by
 * MenubarShortcut.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * MenubarShortcut aligns keyboard shortcut keycaps inside menubar items.
     */
    MenubarShortcut: {
        /** Alignment wrapper for the trailing keyboard hint inside menubar content. See also: {@api theme-key:DropdownMenuShortcut.root}. */
        root: {
            class: "ml-auto inline-flex items-center pl-2",
        },
        /** Local sizing for the nested {@api theme-key:Kbd.root} inside menubar rows. */
        kbd: {
            class: "h-[18px] min-w-[18px] px-1 text-[10px]",
        },
    },
});
