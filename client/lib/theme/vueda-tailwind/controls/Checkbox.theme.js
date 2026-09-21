/**
 * @module theme/vueda-tailwind/controls/Checkbox.theme
 *
 * Per-component theme registration for Checkbox. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    // ---------- Checkbox ----------

    /**
     * Standard boolean checkbox. 4px corner (one step softer than the 2px
     * control radius) so it reads as a chit rather than a miniature slab
     * control. Checked state fills with `--primary`; aria-invalid swaps the
     * fill and ring to destructive.
     */
    Checkbox: {
        /** The boolean-chit shell. 24px square at a 4px corner (one step softer than the 2px control radius) so it reads as a chit rather than a miniature slab control. Default state paints a `hairline` edge on the input-tinted surface and carries the standard focus + `aria-invalid` ring contract. In dark mode the rest edge swaps to `--border-strong` (`dark:hairline-border-strong`) so an unchecked box stays visible on hovered list rows, where the opaque `--input` edge would sink into the `bg-accent/50` hover band. Checked and indeterminate states fill with `--primary` and drop the hairline (the `--vueda-hairline-color:transparent` override on the same selectors) so the surface reads as a single solid swatch; `aria-invalid` swaps both the fill and the painted edge to `--destructive`. The `inline-flex` centring and `align-middle` hold the box to a fixed `size-6` square with a stable baseline whether or not it is checked; keep them when overriding this slot, or toggling a checkbox can reflow baseline-aligned parents (for example the card-layout {@api theme-key:ObjectsGrid} grid). Disabled controls use `--disabled` fill, `--border` edge, and `--disabled-foreground` indicators at full opacity, including when invalid. */
        root: {
            class: [
                // Checked and indeterminate states.
                "peer data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",

                // Shape, disabled state, and icon elements. `inline-flex` + `align-middle` are
                // load-bearing: the indicator is `Presence`-gated (absent when unchecked), so
                // without them the empty box falls back to line-height and its baseline shifts
                // between states. See the slot JSDoc above for the layout consequence.
                "hairline inline-flex items-center justify-center align-middle size-6 shrink-0 rounded-vueda-checkbox shadow-vueda-control transition-shadow disabled:cursor-not-allowed [&_svg]:size-4 [&_svg]:shrink-0",

                // Dark-mode rest edge. Opaque --input (L 0.26) sits inside the row-hover
                // accent band (bg-accent/50 ≈ L 0.255), so an unchecked box's edge vanishes
                // on a hovered list row. --border-strong is translucent, rides the hover
                // ladder, and clears the §2.5 glance threshold at rest / hover / active.
                // Light keeps --input (a dark-on-light edge that never collides). Checked,
                // focus, and aria-invalid overrides below outrank this by specificity.
                "dark:hairline-border-strong",

                // State-specific hairline color.
                "data-[state=checked]:[--vueda-hairline-color:transparent] data-[state=indeterminate]:[--vueda-hairline-color:transparent]",

                // Disabled colors override checked, invalid, and dark-mode recipes without fading the value.
                "disabled:!bg-disabled disabled:!text-disabled-foreground disabled:!hairline-border",

                // Focus and invalid states.
                "focus-visible:hairline-ring focus-visible:focus-ring-shadow",
                "aria-invalid:hairline-destructive aria-invalid:focus-visible:focus-ring-shadow-destructive aria-invalid:data-[state=checked]:bg-destructive aria-invalid:data-[state=checked]:text-destructive-foreground aria-invalid:data-[state=indeterminate]:bg-destructive aria-invalid:data-[state=indeterminate]:text-destructive-foreground",
            ],
        },
        /** The centring grid for the indicator glyph (the check or indeterminate-dash icon rendered inside {@api theme-key:Checkbox.root}). `grid place-content-center` parks the icon dead-centre regardless of font-size or zoom; `text-current` lets the glyph inherit the root's `--primary-foreground` (or destructive-foreground on `aria-invalid`) so a custom icon picks up the correct fill without a second class hook. `transition-none` because the surrounding root owns the state-change tones; an animated indicator would lag the surface flip. */
        indicator: {
            class: ["grid place-content-center text-current transition-none"],
        },
    },
});
