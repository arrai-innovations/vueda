/**
 * @module theme/vueda-tailwind/controls/CommandList.theme
 *
 * Per-component theme registration for CommandList. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the CommandList slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Scrollable region of Command holding the result groups.
     */
    CommandList: {
        /** The scrollable region of {@api theme-key:Command.root} that holds the result groups. See also: {@api theme-key:ComboboxViewport.root}; identical 300px cap and `scroll-py-1` recipe so both pickers feel the same when keyboard navigation crosses the viewport edge. */
        root: {
            class: ["max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto"],
        },
    },
});
