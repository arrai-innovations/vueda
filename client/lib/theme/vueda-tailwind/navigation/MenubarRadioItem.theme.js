/**
 * @module theme/vueda-tailwind/navigation/MenubarRadioItem.theme
 *
 * Per-component theme registration for MenubarRadioItem. Imported as a side effect by
 * MenubarRadioItem.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * MenubarRadioItem styles one option in a radio-style menubar group.
     */
    MenubarRadioItem: {
        /** Radio-style menubar row. Same row geometry as {@api theme-key:MenubarCheckboxItem.root}. */
        root: {
            class: [
                // Interactive states.
                "focus:bg-accent focus:text-accent-foreground active:bg-accent-active active:text-accent-foreground",

                // Layout and type.
                "relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none",

                // Data attribute states.
                "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",

                // Icons and child elements.
                "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            ],
        },
        /** Radio indicator aligned to the menubar row's leading gutter. */
        indicator: { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" },
    },
});
