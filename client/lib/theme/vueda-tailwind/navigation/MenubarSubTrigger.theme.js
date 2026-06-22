/**
 * @module theme/vueda-tailwind/navigation/MenubarSubTrigger.theme
 *
 * Per-component theme registration for MenubarSubTrigger. Imported as a side effect by
 * MenubarSubTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * MenubarSubTrigger styles a menubar item that opens a nested submenu.
     */
    MenubarSubTrigger: {
        /** Menubar row that opens a nested submenu. See also: {@api theme-key:DropdownMenuSubTrigger.root}. */
        root: {
            class: [
                // Interactive states.
                "focus:bg-accent focus:text-accent-foreground active:bg-accent-active active:text-accent-foreground",

                // Open states.
                "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",

                // Layout and type.
                "flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[inset]:pl-8",
            ],
        },
        /** Trailing chevron wrapper for submenu affordance space. */
        iconWrapper: { class: "ml-auto size-4" },
    },
});
