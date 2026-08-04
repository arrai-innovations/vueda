/**
 * @module theme/vueda-tailwind/navigation/MenubarContent.theme
 *
 * Per-component theme registration for MenubarContent. Imported as a side effect by
 * MenubarContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * MenubarContent styles the floating surface opened from a menubar trigger.
     */
    MenubarContent: {
        /** Floating menu surface opened from the menubar. See also: {@api theme-key:DropdownMenuContent.root}. */
        root: {
            class: [
                // Surface and color.
                "bg-popover text-popover-foreground",

                // Motion and animation.
                "data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",

                // Side-aware motion.
                "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",

                // Positioning and sizing.
                "z-50 min-w-[12rem] origin-(--reka-menubar-content-transform-origin)",

                // Shape and border.
                "overflow-hidden rounded-vueda-control overlay-hairline p-1",
            ],
        },
    },
});
