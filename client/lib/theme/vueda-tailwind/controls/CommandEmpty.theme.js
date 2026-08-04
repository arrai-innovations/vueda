/**
 * @module theme/vueda-tailwind/controls/CommandEmpty.theme
 *
 * Per-component theme registration for CommandEmpty. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Placeholder shown when the Command search has zero results.
     */
    CommandEmpty: {
        /** The zero-result placeholder shown inside {@api theme-key:CommandList.root} when the search has no matches. See also: {@api theme-key:ComboboxEmpty.root}; identical recipe. */
        root: {
            class: ["py-6 text-center text-sm"],
        },
    },
});
