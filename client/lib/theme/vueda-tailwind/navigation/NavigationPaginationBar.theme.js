/**
 * @module theme/vueda-tailwind/navigation/NavigationPaginationBar.theme
 *
 * Per-component theme registration for NavigationPaginationBar. Imported as a side effect by
 * PaginationBar.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * NavigationPaginationBar styles a pagination bar anchored below a navigation surface.
     */
    NavigationPaginationBar: {
        /** Footer bar for table and objects-grid pagination, seated against the bottom of card-like data surfaces. The `px-5 py-3` padding matches the list chrome rhythm (e.g. {@api theme-key:ViewList.underActionsBar}) so the chrome above and below the grid read as a matched frame. */
        root: {
            class: [
                // Layout and spacing.
                "flex w-full items-center justify-between gap-3",

                // Shape and surface.
                "rounded-b-vueda-card border-t-hairline bg-card text-foreground px-5 py-3",
            ],
        },
    },
});
