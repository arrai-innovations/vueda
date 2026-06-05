/**
 * @module theme/vueda-tailwind/navigation/DropdownMenuSeparator.theme
 *
 * Per-component theme registration for DropdownMenuSeparator. Imported as a side effect by
 * DropdownMenuSeparator.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DropdownMenuSeparator renders a divider between dropdown menu sections.
     */
    DropdownMenuSeparator: {
        /** Full-width menu divider that bleeds through the content padding. */
        root: {
            class: "bg-border -mx-1 my-1 h-px",
        },
    },
});
