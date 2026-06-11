/**
 * @module theme/vueda-tailwind/navigation/ContextMenuSubTrigger.theme
 *
 * Per-component theme registration for ContextMenuSubTrigger. Imported as a side effect by
 * ContextMenuSubTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ContextMenuSubTrigger styles a context menu item that opens a nested submenu.
     */
    ContextMenuSubTrigger: {
        /** Context-menu row that opens a child surface. See also: {@api theme-key:DropdownMenuSubTrigger.root}. */
        root: {
            class: "focus:bg-accent focus:text-accent-foreground active:bg-accent-active active:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        },
        /** Trailing chevron wrapper for submenu affordance space. */
        iconWrapper: { class: "ml-auto" },
    },
});
