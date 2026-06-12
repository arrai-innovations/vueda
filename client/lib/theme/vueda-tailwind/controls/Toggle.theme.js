/**
 * @module theme/vueda-tailwind/controls/Toggle.theme
 *
 * Per-component theme registration for Toggle. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * A button-shaped on/off control. Differs from Button in that the pressed
     * state is a neutral "this view is active" affordance (`--accent`), not a
     * CTA (`--primary`).
     */
    Toggle: {
        /** The on/off button shell. Reads as a Button shape (control radius, `text-sm font-medium`, 16px icon) but the pressed state (`data-state=on`) paints `--accent` instead of `--primary` so a pressed toggle does not compete with a CTA on the same surface. Two variants (default, `outline`) and three size tiers ride the shared `h-vueda-control*` scale; the `outline` variant wears the same explicit `border-foreground` true-outline edge as {@api theme-key:_ButtonOutline.root}, and `min-w-vueda-control*` keeps a single-icon toggle square. */
        root: ({ variant, size }) => ({
            class: [
                // Layout and type.
                "inline-flex items-center justify-center gap-2 rounded-vueda-control text-sm font-medium",

                // Interactive and active states.
                "hover:bg-muted hover:text-muted-foreground active:bg-accent-active disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",

                // Icons and focus states.
                "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:hairline-ring focus-visible:focus-ring-shadow transition-shadow",

                // Invalid state and wrapping.
                "aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive whitespace-nowrap",

                // Variant classes.
                {
                    "bg-transparent": !variant || variant === "default",
                    "border border-foreground bg-transparent shadow-vueda-control": variant === "outline",
                },

                // Size classes.
                {
                    "h-vueda-control px-2 min-w-vueda-control": !size || size === "default",
                    "h-vueda-control-sm px-1.5 min-w-vueda-control-sm": size === "sm",
                    "h-vueda-control-lg px-2.5 min-w-vueda-control-lg": size === "lg",
                },
            ],
        }),
    },
});
