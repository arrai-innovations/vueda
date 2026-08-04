/**
 * @module theme/vueda-tailwind/navigation/ContextMenuCheckboxItem.theme
 *
 * Per-component theme registration for ContextMenuCheckboxItem. Imported as a side effect by
 * ContextMenuCheckboxItem.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ContextMenuCheckboxItem styles a toggleable context menu choice with an indicator.
     */
    ContextMenuCheckboxItem: {
        /** Toggleable context-menu row with reserved indicator space. See also: {@api theme-key:DropdownMenuCheckboxItem.root}. */
        root: {
            class: [
                // Interactive states.
                "focus:bg-accent focus:text-accent-foreground active:bg-accent-active active:text-accent-foreground",

                // Layout and type.
                "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none",

                // Data attribute states.
                "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",

                // Icons and child elements.
                "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            ],
        },
        /** Checkbox indicator aligned to the context-menu leading gutter. */
        indicator: { class: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center" },
    },
});
