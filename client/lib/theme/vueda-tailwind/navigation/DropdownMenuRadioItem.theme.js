/**
 * @module theme/vueda-tailwind/navigation/DropdownMenuRadioItem.theme
 *
 * Per-component theme registration for DropdownMenuRadioItem. Imported as a side effect by
 * DropdownMenuRadioItem.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DropdownMenuRadioItem styles one option in a radio-style dropdown menu group.
     */
    DropdownMenuRadioItem: {
        /** Mutually exclusive menu row. Same layout as {@api theme-key:DropdownMenuCheckboxItem.root}; selection state comes from the radio primitive. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground active:bg-accent-active active:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        /** Radio selection indicator aligned to the shared leading gutter. */
        indicator: { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" },
    },
});
