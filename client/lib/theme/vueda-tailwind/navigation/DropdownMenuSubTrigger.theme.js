/**
 * @module theme/vueda-tailwind/navigation/DropdownMenuSubTrigger.theme
 *
 * Per-component theme registration for DropdownMenuSubTrigger. Imported as a side effect by
 * DropdownMenuSubTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DropdownMenuSubTrigger styles a dropdown menu item that opens a nested submenu.
     */
    DropdownMenuSubTrigger: {
        /** Menu row that opens a child surface. Open and focused states share the same neutral accent fill. */
        root: {
            class: [
                // Interactive states.
                "focus:bg-accent focus:text-accent-foreground active:bg-accent-active active:text-accent-foreground",

                // Open states.
                "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",

                // Layout and type.
                "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8",

                // Icons and child elements.
                "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",

                // Variant classes.
                "data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground",
            ],
        },
        /** Trailing chevron wrapper that reserves submenu affordance space at the row edge. */
        iconWrapper: { class: "ml-auto size-4" },
    },
});
