/**
 * @module theme/vueda-tailwind/navigation/DropdownMenuContent.theme
 *
 * Per-component theme registration for DropdownMenuContent. Imported as a side effect by
 * DropdownMenuContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DropdownMenuContent styles the floating dropdown menu surface.
     */
    DropdownMenuContent: {
        /** Popover-like menu surface with bounded height, menu padding, and side-aware entrance motion. */
        root: {
            class: [
                // Surface and color.
                "bg-popover text-popover-foreground",

                // Motion and animation.
                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",

                // Side-aware motion.
                "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",

                // Positioning and sizing.
                "z-50 max-h-(--reka-dropdown-menu-content-available-height) min-w-[8rem] origin-(--reka-dropdown-menu-content-transform-origin)",

                // Shape and border.
                "overflow-x-hidden overflow-y-auto rounded-vueda-control border p-1 shadow-vueda-popover",
            ],
        },
    },
});
