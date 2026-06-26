/**
 * @module theme/vueda-tailwind/display/FieldPickerMenuList.theme
 *
 * Per-component theme registration for FieldPickerMenuList. Imported as a side
 * effect by FieldPickerMenuList.vue, so a route chunk that pulls only that SFC
 * drags only this component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * FieldPickerMenuList is the shared field-row list inside the sort and filter
     * add-menus: an eyebrow, a scrollable list of pickable fields, and an empty
     * state. One home for the row styling both menus use.
     */
    FieldPickerMenuList: {
        /** Eyebrow at the top of the field-picker list. The in-popover micro-eyebrow recipe (11 px / 600 / 0.04em). */
        eyebrow: {
            class: [
                "px-2 py-1.5 text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.04em] text-muted-foreground",
            ],
        },
        /** Scrollable list wrapper. Capped so the popover never overflows the viewport on small screens. */
        list: {
            class: ["max-h-60 overflow-y-auto"],
        },
        /** A selectable field row. */
        item: {
            class: [
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
            ],
        },
        /** Empty-state message shown when every field is already in use. */
        empty: {
            class: ["px-2 py-1.5 text-sm text-muted-foreground"],
        },
    },
});
