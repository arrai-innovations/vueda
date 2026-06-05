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
     * MenubarShortcut styles keyboard shortcut hints aligned inside menubar items.
     */
    MenubarShortcut: {
        /** Trailing keyboard hint inside menubar content. See also: {@api theme-key:DropdownMenuShortcut.root}. */
        root: {
            class: "text-muted-foreground ml-auto font-mono text-[length:var(--vueda-text-micro)] font-medium leading-none",
        },
    },
});
