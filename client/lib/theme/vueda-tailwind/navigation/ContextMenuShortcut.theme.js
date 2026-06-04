/**
 * @module theme/vueda-tailwind/navigation/ContextMenuShortcut.theme
 *
 * Per-component theme registration for ContextMenuShortcut. Imported as a side effect by
 * ContextMenuShortcut.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the ContextMenuShortcut slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
