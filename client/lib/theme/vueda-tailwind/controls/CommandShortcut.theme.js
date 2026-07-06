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
        /** Alignment wrapper for the trailing keyboard hint on a {@api theme-key:CommandItem.root}. `ml-auto` pushes the hint flush right while the nested {@api theme-key:KbdGroup.root} owns the chord. */
        root: {
            class: "ml-auto inline-flex items-center pl-2",
        },
        /** Local grouping for parsed shortcut chords inside command rows. */
        group: {
            class: "",
        },
        /** Local sizing for nested {@api theme-key:Kbd.root} chips inside command rows. */
        kbd: {
            class: "h-[18px] min-w-[18px] px-1 text-[10px]",
        },
    },
});
