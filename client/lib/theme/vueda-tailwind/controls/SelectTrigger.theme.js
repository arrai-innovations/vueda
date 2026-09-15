/**
 * @module theme/vueda-tailwind/controls/SelectTrigger.theme
 *
 * Per-component theme registration for SelectTrigger. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * The pressable surface that opens a Select. Reads as a neutral chip (not
     * an input shell) to differentiate Select-the-enum-picker from
     * Combobox-the-searchable-picker.
     */
    SelectTrigger: {
        /** The pressable surface that opens a {@api theme-key:SelectContent.root}. Wears the editable field recipe: a `bg-field` fill on a bottom-only `field-line`, square `rounded-vueda-field` corners, and a `hover:bg-field-hover` step, so a picker that sets a value reads as a field rather than a button. Focus restores the four-sided hairline with the focus ring. Three size tiers ride `h-vueda-control*` plus matching `px-vueda-control-px*`, and `aria-invalid` restores the full edge and swaps the hairline and the focus-ring shadow to destructive. Placeholder text mutes to `--muted-foreground` so an unselected trigger reads as empty rather than as a chosen value. */
        root: {
            class: [
                // Placeholder, icons, and interaction colors.
                "data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground hover:bg-field-hover",

                // Trigger shell.
                "field-line flex w-fit items-center justify-between gap-2 rounded-vueda-field bg-field px-vueda-control-px text-sm whitespace-nowrap shadow-vueda-control transition-shadow",

                // Disabled and size states.
                "data-[size=default]:h-vueda-control data-[size=sm]:h-vueda-control-sm data-[size=lg]:h-vueda-control-lg data-[size=lg]:px-vueda-control-px-lg",

                // Disabled: an inert slab, not a faded field. See README section 7.6.
                "disabled:pointer-events-none disabled:cursor-not-allowed",
                "disabled:!bg-disabled disabled:!text-disabled-foreground disabled:!hairline-border",

                // Value and icon child elements.
                "*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2",
                "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",

                // Focus and invalid states.
                "focus-visible:hairline focus-visible:hairline-ring focus-visible:focus-ring-shadow aria-invalid:hairline aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive",
            ],
        },
    },
});
