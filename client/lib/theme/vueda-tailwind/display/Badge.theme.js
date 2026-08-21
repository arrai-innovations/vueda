/**
 * @module theme/vueda-tailwind/display/Badge.theme
 *
 * Per-component theme registration for Badge. Imported as a side effect by
 * Badge.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

/**
 * Variants that render as a tinted surface rather than a solid fill. They paint the tone
 * itself as the label colour and a 50 % tone hairline, so unlike the solid variants they
 * must not also set a transparent hairline.
 */
const TINTED_VARIANTS = new Set(["info", "success", "warning"]);

patchTheme({
    /**
     * Badge renders compact status, category, or count labels. Variants provide semantic fills while the numeric mode switches to tabular mono sizing.
     */
    Badge: {
        /**
         * Compact slab badge with variant and numeric recipes.
         *
         * Two families of variant share this slot. `default`, `secondary`, and `destructive`
         * are **solid**: a saturated fill with its own `-foreground` token for the label, and a
         * transparent hairline so no edge shows. `info`, `success`, and `warning` are **tinted**:
         * a 10 % surface, the tone itself as the label colour, and a 50 % hairline, which is the
         * pairing the tone tokens document (see `--success` in `base.css`). The split is
         * deliberate rather than an oversight: the three semantic tones have no `-foreground`
         * token, so a solid fill could not state a readable label colour, and every status pill
         * in the kit (for example {@api theme-key:ViewHistoryList.typePill}) already reads as
         * tinted. Use the solid family for identity and counts, the tinted family for status.
         */
        root: ({ variant, numeric }) => ({
            class: [
                // Layout and sizing.
                "inline-flex items-center justify-center",
                "rounded-vueda-control hairline py-0.5",
                "text-xs font-medium",
                "w-fit whitespace-nowrap shrink-0",

                // Icons and child elements.
                "[&>svg]:size-3 gap-1 [&>svg]:pointer-events-none",

                // Focus, invalid, and motion states.
                "focus-visible:focus-ring-shadow",
                "aria-invalid:hairline-destructive aria-invalid:focus-ring-shadow-destructive",
                "transition-colors overflow-hidden",
                {
                    "px-2": !numeric,
                    "font-mono tabular-nums min-w-5 px-1": numeric,
                    // Solid fills hide the edge (transparent hairline colour); `outline` paints a
                    // visible `--border` hairline; the tinted tones paint the tone at 50 %. Each
                    // colour lives in exactly one branch so combineClasses (last-write-wins) never
                    // clears the other, and no two branches set the same custom property with
                    // different values.
                    "[--vueda-hairline-color:transparent]": !TINTED_VARIANTS.has(variant) && variant !== "outline",
                    "hairline-border": variant === "outline",
                    "[--vueda-hairline-color:color-mix(in_oklab,var(--info)_50%,transparent)]": variant === "info",
                    "[--vueda-hairline-color:color-mix(in_oklab,var(--success)_50%,transparent)]":
                        variant === "success",
                    "[--vueda-hairline-color:color-mix(in_oklab,var(--warning)_50%,transparent)]":
                        variant === "warning",
                    "bg-primary text-primary-foreground [a&]:hover:bg-primary-hover [a&]:active:bg-primary-active":
                        !variant || variant === "default",
                    "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary-hover [a&]:active:bg-secondary-active":
                        variant === "secondary",
                    "bg-destructive text-destructive-foreground [a&]:hover:bg-destructive-hover [a&]:active:bg-destructive-active focus-visible:outline-destructive dark:bg-destructive/60":
                        variant === "destructive",
                    "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground [a&]:active:bg-accent-active":
                        variant === "outline",
                    // Tinted semantic tones. Each keeps the tone as its label colour and darkens
                    // the surface a step on an anchor badge's hover and active, so a linked status
                    // pill still reads as pressable without changing family.
                    "text-info bg-info/10 [a&]:hover:bg-info/20 [a&]:active:bg-info/25": variant === "info",
                    "text-success bg-success/10 [a&]:hover:bg-success/20 [a&]:active:bg-success/25":
                        variant === "success",
                    "text-warning bg-warning/10 [a&]:hover:bg-warning/20 [a&]:active:bg-warning/25":
                        variant === "warning",
                },
            ],
        }),
    },
});
