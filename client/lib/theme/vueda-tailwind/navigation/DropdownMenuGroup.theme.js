/**
 * @module theme/vueda-tailwind/navigation/DropdownMenuGroup.theme
 *
 * Per-component theme registration for DropdownMenuGroup. Imported as a side effect by
 * DropdownMenuGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DropdownMenuGroup groups related dropdown menu items.
     */
    DropdownMenuGroup: {
        /** Semantic grouping only. Item spacing and dividers are owned by child item and separator slots. */
        root: { class: "" },
    },
});
