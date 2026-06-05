/**
 * @module theme/vueda-tailwind/controls/CommandShortcut.theme
 *
 * Per-component theme registration for CommandShortcut. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
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
