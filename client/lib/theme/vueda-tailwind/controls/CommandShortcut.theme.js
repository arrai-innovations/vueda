/**
 * @module theme/vueda-tailwind/controls/CommandShortcut.theme
 *
 * Per-component theme registration for CommandShortcut. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the CommandShortcut slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Inline keyboard-shortcut hint on the trailing edge of a CommandItem.
     */
    CommandShortcut: {
        /** The inline keyboard-shortcut hint on the trailing edge of a {@api theme-key:CommandItem.root}. `ml-auto` pushes the hint flush right; renders as xs muted text with `tracking-widest` so a multi-character chord stays scannable inside a single row. Not a kbd shell: the visible glyph box is owned by an inner `<kbd>`. */
        root: {
            class: ["text-muted-foreground ml-auto text-xs tracking-widest"],
        },
    },
});
