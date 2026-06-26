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
        /** Group eyebrow at the top of the add-filter list and the drill-in. The in-popover micro-eyebrow recipe (11 px / 600 / 0.04em). */
        eyebrow: {
            class: [
                "px-2 py-1.5 text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.04em] text-muted-foreground",
            ],
        },
        /** A selectable field row in the add-filter list. */
        item: {
            class: [
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
            ],
        },
        /** Back row that returns from the drill-in form to the field list. */
        back: {
            class: [
                "flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            ],
        },
        /** Hairline separator between the back row and the drill-in form. */
        separator: {
            class: ["bg-border -mx-1 my-1 h-px"],
        },
        /** Drill-in body padding around the embedded filter form. */
        drillIn: {
            class: ["px-2 pb-1 pt-0.5"],
        },
        /** Empty-state message shown when every filterable field is already applied. */
        empty: {
            class: ["px-2 py-1.5 text-sm text-muted-foreground"],
        },
    },
});
