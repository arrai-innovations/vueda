/**
 * @module theme/vueda-tailwind/controls/InputGroupButton.theme
 *
 * Per-component theme registration for InputGroupButton. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Pressable addon inside an InputGroup. Sized smaller than a standalone
     * Button (xs, sm, icon-xs, icon-sm tiers) so it fits inside the input
     * shell.
     */
    InputGroupButton: {
        /** Pressable addon inside an {@api theme-key:InputGroup.root}. Sized smaller than a standalone {@api theme-key:Button.root} (`xs`, `sm`, plus `icon-xs` / `icon-sm`) so the button fits inside the input shell without breaking the row's `h-vueda-control` baseline. Shadow is suppressed because the group already carries `shadow-vueda-control`; an inset button drawing its own shadow would double-paint at the addon edge. The `xs` and `icon-xs` tiers use a tighter `rounded-[calc(var(--radius)-5px)]` so a 24px button reads as a chip inside a 32px shell rather than a miniature slab. */
        root: ({ size }) => ({
            class: [
                // Base classes.
                "text-sm shadow-none flex gap-2 items-center",

                // Size classes.
                {
                    "h-6 gap-1 px-2 rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-3.5 has-[>svg]:px-2":
                        !size || size === "xs",
                    "h-vueda-control-sm px-vueda-control-px-sm gap-1.5 rounded-vueda-control has-[>svg]:px-vueda-control-px-sm":
                        size === "sm",
                    "size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0": size === "icon-xs",
                    "size-vueda-control-sm p-0 has-[>svg]:p-0": size === "icon-sm",
                },
            ],
        }),
    },
});
