/**
 * @module theme/vueda-tailwind/controls/NativeSelect.theme
 *
 * Per-component theme registration for NativeSelect. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Native `<select>` styled to match the VUEDA control shell. Used where a
     * JS-driven combobox or select would be overkill (short fixed enums on
     * touch devices, fallback contexts).
     */
    NativeSelect: {
        /** The native `<select>` styled to match the VUEDA control shell. Used where a JS-driven {@api theme-key:SelectTrigger} or {@api theme-key:ComboboxTrigger} would be overkill: short fixed enums on touch devices, environments where native menu UX is preferred. Same control-height, `bg-field` fill, bottom `field-line`, recoloured focus line, and `aria-invalid` shell as {@api theme-key:Input.root}, with the shared `hover:bg-field-hover` step. `appearance-none` strips the native chevron and `pr-9` reserves space for the icon the consumer paints. The option surface inside the dropdown is owned by the OS; deep styling lives in the JS-driven pickers. */
        root: {
            class: [
                // Text selection and picker states.
                "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground hover:bg-field-hover",

                // Native select shell.
                "field-line h-vueda-control w-full min-w-0 appearance-none rounded-vueda-field bg-field px-vueda-control-px pr-9 text-sm shadow-vueda-control transition-shadow",

                // Disabled state.
                // Disabled: an inert slab, not a faded field. See README section 7.6.
                "disabled:pointer-events-none disabled:cursor-not-allowed",
                "disabled:!bg-disabled disabled:!text-disabled-foreground disabled:!hairline-border",

                // Focus and invalid states.
                "focus-visible:hairline-ring focus-visible:focus-ring-shadow",
                "aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive",
            ],
        },
    },
});
