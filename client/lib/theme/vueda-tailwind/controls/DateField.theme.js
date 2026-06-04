/**
 * @module theme/vueda-tailwind/controls/DateField.theme
 *
 * Per-component theme registration for DateField. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the DateField slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Date picker rendered as a row of editable date segments (year / month /
     * day). Shares the input shell with Input; segments are individually
     * focusable and increment with arrow keys.
     */
    DateField: {
        /** The input-shaped shell hosting the editable date segments. Same hairline + focus + `aria-invalid` recipe as {@api theme-key:Input.root}, with the row of {@api theme-key:DateFieldInput.root} segments laid out as flex items inside; sizes pick the standard `h-vueda-control*` tier from `base.css § Control sizing`. The read-only treatment swaps to `bg-muted/50` so a frozen date field reads as the same surface family as a read-only text input. */
        root: ({ size }) => ({
            class: [
                "dark:bg-input/30 flex w-full items-center rounded-vueda-control hairline bg-transparent text-sm shadow-vueda-control transition-shadow focus-within:hairline-ring focus-within:focus-ring-shadow data-[readonly]:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50",
                "aria-invalid:hairline-destructive focus-within:aria-invalid:focus-ring-shadow-destructive",
                {
                    "h-vueda-control px-vueda-control-px": !size || size === "default",
                    "h-vueda-control-sm px-vueda-control-px-sm": size === "sm",
                    "h-vueda-control-lg px-vueda-control-px-lg": size === "lg",
                },
            ],
        }),
    },
});
