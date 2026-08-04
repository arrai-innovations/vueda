/**
 * @module theme/vueda-tailwind/navigation/MenubarItem.theme
 *
 * Per-component theme registration for MenubarItem. Imported as a side effect by
 * MenubarItem.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * MenubarItem styles a selectable command inside menubar content.
     */
    MenubarItem: {
        /** Selectable menubar command row. See also: {@api theme-key:DropdownMenuItem.root}. */
        root: {
            class: [
                // Interactive states.
                "focus:bg-accent focus:text-accent-foreground active:bg-accent-active active:text-accent-foreground",

                // Variant classes.
                "data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive",
                "data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground",

                // Layout and type.
                "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none",

                // Data attribute states.
                "data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8",

                // Icons and child elements.
                "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },
});
