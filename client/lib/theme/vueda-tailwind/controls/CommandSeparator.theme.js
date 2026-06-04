/**
 * @module theme/vueda-tailwind/controls/CommandSeparator.theme
 *
 * Per-component theme registration for CommandSeparator. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the CommandSeparator slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * 1px divider between sections inside Command.
     */
    CommandSeparator: {
        /** A 1px horizontal divider between groups inside {@api theme-key:CommandList.root}. See also: {@api theme-key:ComboboxSeparator.root}; identical recipe. */
        root: {
            class: ["bg-border -mx-1 h-px"],
        },
    },
});
