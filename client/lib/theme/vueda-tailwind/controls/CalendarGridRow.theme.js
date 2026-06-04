/**
 * @module theme/vueda-tailwind/controls/CalendarGridRow.theme
 *
 * Per-component theme registration for CalendarGridRow. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the CalendarGridRow slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * A single week row inside a CalendarGrid.
     */
    CalendarGridRow: {
        /** A single week row inside a {@api theme-key:CalendarGrid.root}. Flex row; cell width comes from `flex-1` on the children, not from a column template. */
        root: {
            class: ["flex"],
        },
    },
});
