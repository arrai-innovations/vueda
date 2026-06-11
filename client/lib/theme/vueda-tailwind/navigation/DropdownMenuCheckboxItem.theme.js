/**
 * @module theme/vueda-tailwind/navigation/DropdownMenuCheckboxItem.theme
 *
 * Per-component theme registration for DropdownMenuCheckboxItem. Imported as a side effect by
 * DropdownMenuCheckboxItem.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DropdownMenuCheckboxItem styles a toggleable dropdown menu choice with an indicator.
     */
    DropdownMenuCheckboxItem: {
        /** Toggleable menu row with reserved indicator space at the leading edge. See also: {@api theme-key:DropdownMenuItem.root}. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground active:bg-accent-active active:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        /** Absolute indicator box aligned inside the leading gutter reserved by {@api theme-key:DropdownMenuCheckboxItem.root}. */
        indicator: { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" },
    },
});
