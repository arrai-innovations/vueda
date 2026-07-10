/**
 * @module theme/vueda-tailwind/controls/CommandSeparator.theme
 *
 * Per-component theme registration for CommandSeparator. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * 1px divider between sections inside Command.
     */
    CommandSeparator: {
        /** A 1px horizontal divider between groups inside {@api theme-key:CommandList.root}. See also: {@api theme-key:ComboboxSeparator.root}; identical recipe. */
        root: {
            class: ["bg-border -mx-1 h-hairline"],
        },
    },
});
