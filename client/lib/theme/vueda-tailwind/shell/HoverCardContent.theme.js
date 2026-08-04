/**
 * @module theme/vueda-tailwind/shell/HoverCardContent.theme
 *
 * Per-component theme registration for HoverCardContent. Imported as a side effect by
 * HoverCardContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * HoverCardContent styles contextual content displayed from a hover trigger.
     */
    HoverCardContent: {
        /**
         * The floating hover-card panel. It uses the popover surface recipe at a tighter width for glance-weight summaries.
         */
        root: {
            class: [
                // Surface and state motion.
                "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",

                // Side motion.
                "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",

                // Positioning and shape.
                "z-50 w-64 rounded-vueda-control overlay-hairline p-4 outline-hidden",
            ],
        },
    },
});
