/**
 * @module theme/vueda-tailwind/grid/TableBody.theme
 *
 * Per-component theme registration for TableBody. Imported as a side effect by
 * TableBody.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire grid family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Table body section for rendered data rows. Keeps the final row from
     * painting a duplicate bottom edge inside the table container.
     */
    TableBody: {
        /**
         * The `<tbody>` section wrapper. It removes the last row's divider from that row's cells so the enclosing {@api theme-key:Table.container} edge remains the closing edge instead of doubling the table bottom.
         */
        root: {
            class: "[&>tr:last-child>*]:border-b-0",
        },
    },
});
