/**
 * @module theme/vueda-tailwind/controls/DateRangeField.theme
 *
 * Per-component theme registration for DateRangeField. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Two-DateField row representing a start / end date pair, joined into a
     * single shell.
     */
    DateRangeField: {
        /** The input-shell variant that joins a start / end {@api theme-key:DateRangeFieldInput.root} pair into one chip. See also: {@api theme-key:DateField.root} for the shared shell recipe; delta is that the row hosts two segment runs separated by a literal separator glyph rendered by the component rather than a single run. */
        root: ({ size }) => ({
            class: [
                // Shell and surface.
                "flex w-full items-center rounded-vueda-field field-line bg-field hover:bg-field-hover text-sm shadow-vueda-control transition-shadow",

                // Focus, read-only, and disabled states.
                "focus-within:hairline-ring focus-within:focus-ring-shadow",

                // Disabled: an inert slab, not a faded field. The state is a data attribute on a
                // wrapper element, which the `disabled:` variant (`:disabled`) never matches.
                "data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed",
                "data-[disabled]:bg-disabled data-[disabled]:text-disabled-foreground data-[disabled]:hairline-border",
                "data-[readonly]:bg-transparent data-[readonly]:hover:bg-transparent data-[readonly]:hairline-border",
                "aria-invalid:hairline-destructive focus-within:aria-invalid:focus-ring-shadow-destructive",

                // Size classes.
                {
                    "h-vueda-control px-vueda-control-px": !size || size === "default",
                    "h-vueda-control-sm px-vueda-control-px-sm": size === "sm",
                    "h-vueda-control-lg px-vueda-control-px-lg": size === "lg",
                },
            ],
        }),
    },
});
