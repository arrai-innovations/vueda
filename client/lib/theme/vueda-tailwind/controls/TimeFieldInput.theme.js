/**
 * @module theme/vueda-tailwind/controls/TimeFieldInput.theme
 *
 * Per-component theme registration for TimeFieldInput. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the TimeFieldInput slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Individual time segment inside TimeField. Same recipe as DateFieldInput.
     */
    TimeFieldInput: {
        /** An editable segment inside a {@api theme-key:TimeField.root}. See also: {@api theme-key:DateFieldInput.root}; identical recipe. */
        root: {
            class: [
                "inline rounded-sm px-0.5 text-center font-mono font-medium [font-feature-settings:'tnum','zero'] caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder]:text-muted-foreground",
            ],
        },
    },
});
