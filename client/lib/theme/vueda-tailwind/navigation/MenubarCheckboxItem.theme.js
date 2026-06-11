/**
 * @module theme/vueda-tailwind/navigation/MenubarCheckboxItem.theme
 *
 * Per-component theme registration for MenubarCheckboxItem. Imported as a side effect by
 * MenubarCheckboxItem.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * MenubarCheckboxItem styles a toggleable menubar choice with an indicator.
     */
    MenubarCheckboxItem: {
        /** Toggleable menubar row with reserved indicator space. Differs from dropdown by using the tighter menubar row radius. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground active:bg-accent-active active:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        /** Checkbox indicator aligned to the menubar row's leading gutter. */
        indicator: { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" },
    },
});
