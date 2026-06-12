/**
 * @module theme/vueda-tailwind/controls/TimeFieldInput.theme
 *
 * Per-component theme registration for TimeFieldInput. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
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
                // Segment layout and type.
                "inline rounded-sm px-0.5 text-center font-mono font-medium [font-feature-settings:'tnum','zero']",

                // Caret, focus, and placeholder states.
                "caret-transparent outline-none focus:bg-accent focus:text-accent-foreground data-[placeholder]:text-muted-foreground",
            ],
        },
    },
});
