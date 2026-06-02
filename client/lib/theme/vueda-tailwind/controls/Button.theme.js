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
 *
 * Prototype-phase duplication: the `Button` entry here mirrors the `Button`
 * slice of `controls/index.js`, which remains the docs-tooling source of truth
 * until the extractor learns to walk `*.theme.js`. Under the legacy
 * `setTheme(vuedaTailwind)` path the wholesale replace overwrites this patch
 * with identical data; when an integrator drops `setTheme`, this file (plus the
 * primitives module it imports) is the only place Button gets registered, and
 * only routes that import Button.vue pay for it.
 *
 * End-state migration: move source-of-truth here, update docs-tooling to walk
 * `*.theme.js`, and remove the Button slice from `controls/index.js`.
 */
import "./_ButtonPrimitives.theme.js";
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    Button: {
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
                    class: ["h-auto px-0", ...cooldownClass],
                };
            }
            return {
                composes: ["_ButtonBase.root", variantKey],
                class: [
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
                    ...cooldownClass,
                ],
            };
        },
    },
});
