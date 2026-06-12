/**
 * @module theme/vueda-tailwind/controls/RadioGroupItem.theme
 *
 * Per-component theme registration for RadioGroupItem. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Individual radio button inside a RadioGroup. The `indicator` and `dot`
     * slots paint the SVG circle dot inside the ring.
     */
    RadioGroupItem: {
        /** The individual radio chit inside a {@api theme-key:RadioGroup.root}. 24px circle, paired with the 24px {@api theme-key:Checkbox.root} square so the two single-select families share a row height. `hairline` edge on an input-tinted surface (`dark:bg-input/30`) with the standard focus + `aria-invalid` ring contract. Selected state is carried by the inner {@api theme-key:RadioGroupItem.dot} via `text-primary` on the root (the dot inherits the colour through `bg-current`); `aria-invalid` recolours the dot to `--destructive` the same way. */
        root: {
            class: [
                // Surface and shape.
                "text-primary dark:bg-input/30 hairline aspect-square size-6 shrink-0 rounded-full shadow-vueda-control transition-shadow",

                // Disabled, focus, and invalid states.
                "disabled:cursor-not-allowed disabled:opacity-50",
                "focus-visible:hairline-ring focus-visible:focus-ring-shadow",
                "aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive aria-invalid:text-destructive",
            ],
        },
        /** The centring wrapper for the selected dot. `relative flex items-center justify-center` parks the painted {@api theme-key:RadioGroupItem.dot} dead-centre regardless of font-size or zoom; the parallel of {@api theme-key:Checkbox.indicator} for the radio family's single-select shape. */
        indicator: {
            class: ["relative flex items-center justify-center"],
        },
        /** The selected-state dot painted inside {@api theme-key:RadioGroupItem.indicator}. 12px circle on `bg-current` so it inherits the parent {@api theme-key:RadioGroupItem.root}'s `text-primary` (or `text-destructive` when `aria-invalid`); using `current` keeps the dot in lockstep with the surrounding ring colour without a second class hook. */
        dot: {
            class: ["size-3 rounded-full bg-current"],
        },
    },
});
