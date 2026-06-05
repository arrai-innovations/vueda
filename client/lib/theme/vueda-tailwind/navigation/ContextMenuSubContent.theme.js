/**
 * @module theme/vueda-tailwind/navigation/ContextMenuSubContent.theme
 *
 * Per-component theme registration for ContextMenuSubContent. Imported as a side effect by
 * ContextMenuSubContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ContextMenuSubContent styles the floating surface for nested context menu content.
     */
    ContextMenuSubContent: {
        /** Child context-menu surface. See also: {@api theme-key:DropdownMenuSubContent.root}. */
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--reka-context-menu-content-transform-origin) overflow-hidden rounded-vueda-control border p-1 shadow-vueda-popover",
        },
    },
});
