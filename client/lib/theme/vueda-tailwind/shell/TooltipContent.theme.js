/**
 * @module theme/vueda-tailwind/shell/TooltipContent.theme
 *
 * Per-component theme registration for TooltipContent. Imported as a side effect by
 * TooltipContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * TooltipContent styles compact floating help text and its arrow.
     */
    TooltipContent: {
        /**
         * The compact floating tooltip panel. It inverts foreground and background tokens, uses control radius, and follows the tooltip surface rule.
         */
        root: {
            class: [
                // Surface and state motion.
                "bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",

                // Side motion.
                "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",

                // Positioning, shape, and type.
                "z-50 w-fit rounded-vueda-control px-3 py-1.5 text-xs font-medium text-balance",
            ],
        },
        /**
         * The tooltip arrow. It is a small rotated square that inherits the tooltip surface color and sits behind the panel edge.
         */
        arrow: {
            class: [
                // Surface and positioning.
                "bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)]",

                // Shape.
                "rotate-45 rounded-[2px]",
            ],
        },
    },
});
