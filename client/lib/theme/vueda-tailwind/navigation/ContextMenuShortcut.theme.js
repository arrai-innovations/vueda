/**
 * @module theme/vueda-tailwind/navigation/ContextMenuShortcut.theme
 *
 * Per-component theme registration for ContextMenuShortcut. Imported as a side effect by
 * ContextMenuShortcut.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ContextMenuShortcut aligns keyboard shortcut keycaps inside context menu items.
     */
    ContextMenuShortcut: {
        /** Alignment wrapper for context-menu command shortcuts. See also: {@api theme-key:DropdownMenuShortcut.root}. */
        root: {
            class: "ml-auto inline-flex items-center pl-2",
        },
        /** Local sizing for the nested {@api theme-key:Kbd.root} inside menu rows. */
        kbd: {
            class: "h-[18px] min-w-[18px] px-1 text-[10px]",
        },
    },
});
