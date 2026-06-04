/**
 * @module theme/vueda-tailwind/navigation/DropdownMenuShortcut.theme
 *
 * Per-component theme registration for DropdownMenuShortcut. Imported as a side effect by
 * DropdownMenuShortcut.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the DropdownMenuShortcut slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
