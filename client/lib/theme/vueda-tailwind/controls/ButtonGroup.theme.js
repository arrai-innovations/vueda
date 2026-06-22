/**
 * @module theme/vueda-tailwind/controls/ButtonGroup.theme
 *
 * Per-component theme registration for ButtonGroup. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Layout shell that joins adjacent controls into a single segmented unit.
     * Strips inner radii and borders so the children read as one slab; supports
     * horizontal (default) and vertical orientation.
     */
    ButtonGroup: {
        /** The segmented-cluster shell. Strips inner radii and shared borders between adjacent children so a row (or column when `orientation` is `vertical`) of buttons, inputs, and Select triggers reads as one slab; focus z-index promotion keeps the focus ring from being clipped by neighbours. Nested {@api theme-key:ButtonGroup} children retain an 8px gap. The icon-only-stays-seamless / text-or-mixed-keeps-seams rule is applied by the component, not this slot. */
        root: ({ orientation }) => ({
            class: [
                // Layout and child focus handling.
                "flex w-fit items-stretch [&>*]:focus-visible:z-10 [&>*]:focus-visible:relative",

                // Child sizing and nested groups.
                "[&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md has-[>[data-slot=button-group]]:gap-2",

                // Orientation classes.
                {
                    "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none":
                        !orientation || orientation === "horizontal",
                    "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none":
                        orientation === "vertical",
                },
            ],
        }),
    },
});
