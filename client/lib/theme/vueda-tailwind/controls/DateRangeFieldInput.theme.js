/**
 * @module theme/vueda-tailwind/controls/DateRangeFieldInput.theme
 *
 * Per-component theme registration for DateRangeFieldInput. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the DateRangeFieldInput slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Individual date segment inside DateRangeField. Same recipe as
     * DateFieldInput.
     */
    DateRangeFieldInput: {
        /** An editable segment inside a {@api theme-key:DateRangeField.root}. See also: {@api theme-key:DateFieldInput.root}; same mono + tabular + slashed-zero, accent-on-focus, `caret-transparent` recipe applies. */
        root: {
            class: [
                "inline rounded-sm px-0.5 text-center font-mono font-medium [font-feature-settings:'tnum','zero'] caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder]:text-muted-foreground",
            ],
        },
    },
});
