/**
 * @module theme/vueda-tailwind/shell/Item.theme
 *
 * Per-component theme registration for Item. Imported as a side effect by
 * Item.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Item styles a reusable row-like content block with variants for plain, muted, and outlined contexts.
     */
    Item: {
        /**
         * The row-like item wrapper. It carries the default, outline, and muted variants, size spacing, anchor hover behavior, and focus treatment.
         */
        root: ({ variant, size }) => {
            const variantClass =
                variant === "outline"
                    ? "border-border"
                    : variant === "muted"
                      ? "bg-muted/50 text-foreground"
                      : "bg-transparent";
            const sizeClass = size === "sm" ? "py-3 px-4 gap-2.5" : "p-4 gap-4";
            return {
                class: [
                    "group/item flex items-center border border-transparent text-sm rounded-md transition-colors [a]:hover:bg-accent/50 [a]:active:bg-accent [a]:transition-colors duration-100 flex-wrap focus-visible:focus-ring",
                    variantClass,
                    sizeClass,
                ],
            };
        },
    },
});
