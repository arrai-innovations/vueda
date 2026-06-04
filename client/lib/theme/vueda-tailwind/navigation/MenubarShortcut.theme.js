/**
 * @module theme/vueda-tailwind/navigation/MenubarShortcut.theme
 *
 * Per-component theme registration for MenubarShortcut. Imported as a side effect by
 * MenubarShortcut.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the MenubarShortcut slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
