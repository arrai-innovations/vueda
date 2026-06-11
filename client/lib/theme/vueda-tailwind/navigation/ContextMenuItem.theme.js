/**
 * @module theme/vueda-tailwind/navigation/ContextMenuItem.theme
 *
 * Per-component theme registration for ContextMenuItem. Imported as a side effect by
 * ContextMenuItem.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ContextMenuItem styles a selectable command inside a context menu.
     */
    ContextMenuItem: {
        /** Selectable context-menu row. See also: {@api theme-key:DropdownMenuItem.root}. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground active:bg-accent-active active:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
    },
});
