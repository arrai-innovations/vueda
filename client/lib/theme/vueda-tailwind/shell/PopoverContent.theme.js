/**
 * @module theme/vueda-tailwind/shell/PopoverContent.theme
 *
 * Per-component theme registration for PopoverContent. Imported as a side effect by
 * PopoverContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * PopoverContent styles positioned floating content opened by a popover trigger.
     */
    PopoverContent: {
        /**
         * The positioned popover panel. Uses the shared floating surface recipe. Width is not set here — the element uses `width: auto` (shrink-to-fit) by default; pass a `class` prop to the `PopoverContent` component to set a specific width or minimum if the content needs one.
         */
        root: {
            class: [
                // Surface and state motion.
                "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",

                // Side motion.
                "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",

                // Positioning, shape, padding, and transform origin.
                "z-50 p-3 rounded-vueda-control overlay-hairline origin-(--reka-popover-content-transform-origin) outline-hidden",
            ],
        },
    },
});
