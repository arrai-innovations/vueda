/**
 * @module theme/vueda-tailwind/form/FilterMenu.theme
 *
 * Per-component theme registration for FilterMenu. Imported as a side effect by
 * FilterMenu.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * FilterMenu is the toolbar entry point for adding filters. Its trigger
     * opens a popover that lists the not-yet-applied fields and drills into a
     * chosen field's form in place.
     */
    FilterMenu: {
        /** Back row that returns from the drill-in form to the field list. */
        back: {
            class: [
                "flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            ],
        },
        /** Hairline separator between the back row and the drill-in form. */
        separator: {
            class: ["bg-border -mx-1 my-1 h-hairline"],
        },
        /** Drill-in body padding around the embedded filter form. */
        drillIn: {
            class: ["px-2 pb-1 pt-0.5"],
        },
    },
});
