/**
 * @module theme/vueda-tailwind/display/Badge.theme
 *
 * Per-component theme registration for Badge. Imported as a side effect by
 * Badge.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Badge renders compact status, category, or count labels. Variants provide semantic fills while the numeric mode switches to tabular mono sizing.
     */
    Badge: {
        /** Compact slab badge with variant and numeric recipes. */
        root: ({ variant, numeric }) => ({
            class: [
                // Layout and sizing.
                "inline-flex items-center justify-center",
                "rounded-vueda-control border py-0.5",
                "text-xs font-medium",
                "w-fit whitespace-nowrap shrink-0",

                // Icons and child elements.
                "[&>svg]:size-3 gap-1 [&>svg]:pointer-events-none",

                // Focus, invalid, and motion states.
                "focus-visible:focus-ring-shadow",
                "aria-invalid:border-destructive aria-invalid:focus-ring-shadow-destructive",
                "transition-colors overflow-hidden",
                {
                    "px-2": !numeric,
                    "font-mono tabular-nums min-w-5 px-1": numeric,
                    // Solid fills make the base `border` transparent (it only reserves
                    // space); `outline` keeps a visible border. Hoisted to one key so a
                    // sibling branch's `false` cannot clear it (combineClasses last-write-wins).
                    "border-transparent": variant !== "outline",
                    "bg-primary text-primary-foreground [a&]:hover:bg-primary-hover [a&]:active:bg-primary-active":
                        !variant || variant === "default",
                    "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary-hover [a&]:active:bg-secondary-active":
                        variant === "secondary",
                    "bg-destructive text-destructive-foreground [a&]:hover:bg-destructive-hover [a&]:active:bg-destructive-active focus-visible:outline-destructive dark:bg-destructive/60":
                        variant === "destructive",
                    "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground [a&]:active:bg-accent-active":
                        variant === "outline",
                },
            ],
        }),
    },
});
