/**
 * @module theme/vueda-tailwind/controls/Button.theme
 *
 * Per-component theme registration for Button. Imported as a side effect by
 * Button.vue, so a route chunk that pulls only Button.vue drags only the
 * Button family's theme entries (not the entire controls family).
 *
 * The shared `_Button*` composition primitives live in
 * `_ButtonPrimitives.theme.js` (a single owning module, since components in
 * other families compose them too). This file imports that module for its side
 * effect, then registers the `Button` entry itself.
 */
import "./_ButtonPrimitives.theme.js";
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The standard pressable control. Variants pick which `_Button*` primitive
     * composes into the root (`default`, `destructive`, `outline`, `secondary`,
     * `ghost`, `link`); `size` picks the control-height tier (`default`, `sm`,
     * `lg`, plus `icon` / `icon-sm` / `icon-lg`). The `link` variant is
     * inline-flow and skips the control-height + padding recipe.
     */
    Button: {
        /** The pressable root. Composes {@api theme-key:_ButtonBase.root} plus the variant primitive named by `variant`, then layers the per-size height / padding pair from `base.css § Control sizing` (or `size-vueda-control*` for icon-only sizes). The `link` variant skips the control-height block and goes inline. The `data-state=cooldown` state (set by the component while a one-shot action is recovering) mutes the label to `--muted-foreground` and suppresses hover so a recently-clicked button reads as "wait" without changing layout. */
        root: ({ variant, size }) => {
            const v = variant || "default";
            const variantKey = `_Button${v.charAt(0).toUpperCase()}${v.slice(1)}.root`;
            const cooldownClass = [
                "data-[state=cooldown]:text-muted-foreground",
                "data-[state=cooldown]:cursor-default",
                "data-[state=cooldown]:hover:bg-transparent",
                "data-[state=cooldown]:hover:text-muted-foreground",
            ];
            if (v === "link") {
                return {
                    composes: ["_ButtonBase.root", variantKey],
                    class: [
                        // Link sizing.
                        "h-auto px-0",

                        // Cooldown state.
                        ...cooldownClass,
                    ],
                };
            }
            return {
                composes: ["_ButtonBase.root", variantKey],
                class: [
                    // Size classes.
                    {
                        "h-vueda-control px-vueda-control-px has-[>svg]:px-vueda-control-px-sm":
                            !size || size === "default",
                        "h-vueda-control-sm gap-1.5 px-vueda-control-px-sm has-[>svg]:px-vueda-control-px-sm":
                            size === "sm",
                        "h-vueda-control-lg px-vueda-control-px-lg has-[>svg]:px-vueda-control-px": size === "lg",
                        "size-vueda-control": size === "icon",
                        "size-vueda-control-sm": size === "icon-sm",
                        "size-vueda-control-lg": size === "icon-lg",
                    },

                    // Cooldown state.
                    ...cooldownClass,
                ],
            };
        },
    },
});
