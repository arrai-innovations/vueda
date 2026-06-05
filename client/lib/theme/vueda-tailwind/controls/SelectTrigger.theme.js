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
        /** The pressable surface that opens a {@api theme-key:SelectContent.root}. Reads as a neutral chip (transparent at rest, `hairline` border, `shadow-vueda-control` micro-shadow, control-radius corners) rather than the input shell {@api theme-key:ComboboxTrigger.root} wears, because Select is an enum picker and the user is not about to type. Hover paints `hairline-border-strong` (one step darker than the resting hairline) without firing the focus ring. Three size tiers ride `h-vueda-control*` plus matching `px-vueda-control-px*`; dark mode follows the input-tint convention (`bg-input/30`, hover `bg-input/50`), and `aria-invalid` swaps both the hairline and the focus-ring shadow to destructive. Placeholder text mutes to `--muted-foreground` so an unselected trigger reads as empty rather than as a chosen value. */
        root: {
            class: [
                "data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 hover:hairline-border-strong hairline flex w-fit items-center justify-between gap-2 rounded-vueda-control bg-transparent px-vueda-control-px text-sm whitespace-nowrap shadow-vueda-control transition-shadow disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-vueda-control data-[size=sm]:h-vueda-control-sm data-[size=lg]:h-vueda-control-lg data-[size=lg]:px-vueda-control-px-lg *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:hairline-ring focus-visible:focus-ring-shadow aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive",
            ],
        },
    },
});
