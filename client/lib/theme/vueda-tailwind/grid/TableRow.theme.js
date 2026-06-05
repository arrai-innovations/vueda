/**
 * @module theme/vueda-tailwind/grid/TableRow.theme
 *
 * Per-component theme registration for TableRow. Imported as a side effect by
 * TableRow.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire grid family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Row primitive for table body and header sections. Provides hover chrome,
     * selected-row tinting, and the standard bottom divider.
     */
    TableRow: {
        /**
         * The row slot shared by header, body, and footer sections. It provides hover feedback, selected-row tinting, the leading selected rail, and the standard divider.
         */
        root: {
            class: "hover:bg-muted/50 data-[state=selected]:bg-primary/[0.06] data-[state=selected]:hover:bg-primary/[0.09] data-[state=selected]:[box-shadow:inset_2px_0_0_0_var(--primary)] border-b transition-colors",
        },
    },
});
