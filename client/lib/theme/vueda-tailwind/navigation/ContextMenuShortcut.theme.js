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
     * ContextMenuShortcut styles keyboard shortcut hints aligned inside context menu items.
     */
    ContextMenuShortcut: {
        /** Trailing keyboard hint for context-menu commands. See also: {@api theme-key:DropdownMenuShortcut.root}. */
        root: {
            class: "text-muted-foreground ml-auto font-mono text-[length:var(--vueda-text-micro)] font-medium leading-none",
        },
    },
});
