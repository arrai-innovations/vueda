/**
 * @module theme/vueda-tailwind/controls/Textarea.theme
 *
 * Per-component theme registration for Textarea. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Multi-line text input. Shares the input-shell treatment with Input but
     * expands vertically via `field-sizing: content`.
     */
    Textarea: {
        /** The multi-line counterpart to {@api theme-key:Input.root}. Same field fill, bottom `field-line`, recoloured focus and `aria-invalid` line, and read-only recipe; grows vertically via `field-sizing: content` so the field expands with the typed text rather than holding a fixed `min-height`. Horizontal padding moves to `px-3 py-2` (both axes) because a textarea's content box is two-dimensional. */
        root: {
            class: [
                // Placeholder and surface.
                "placeholder:text-muted-foreground",

                // Textarea shell.
                "field-line flex field-sizing-content min-h-16 w-full rounded-vueda-field bg-field hover:bg-field-hover px-3 py-2 text-base shadow-vueda-control transition-shadow",

                // Disabled and responsive states.
                "md:text-sm",

                // Disabled: an inert slab, not a faded field. See README section 7.6.
                "disabled:pointer-events-none disabled:cursor-not-allowed",
                "disabled:!bg-disabled disabled:!text-disabled-foreground disabled:!hairline-border",
                "disabled:[-webkit-text-fill-color:var(--disabled-foreground)]",

                // Focus and invalid states.
                "focus-visible:hairline-ring focus-visible:focus-ring-shadow aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive",
                "read-only:bg-transparent read-only:hover:bg-transparent read-only:hairline-border",
            ],
        },
    },
});
