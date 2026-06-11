/**
 * @module theme/vueda-tailwind/controls/SelectItem.theme
 *
 * Per-component theme registration for SelectItem. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Individual option inside a SelectContent. The committed value tints
     * with `bg-primary/10`; the highlighted-but-not-committed option uses
     * `--accent`.
     */
    SelectItem: {
        /** A single option inside a {@api theme-key:SelectContent.viewport}. Carries the two-track selection state that distinguishes Select from Combobox: the highlighted-but-not-committed option paints `--accent` / `--accent-foreground` on `:focus`, while the committed value (`data-state=checked`) tints with `bg-primary/10` so the chosen option reads as a soft primary band even when another row is highlighted; the indicator icon alone is not a strong enough signal at rest. `pr-8` reserves trailing space for the check indicator; `rounded-sm` keeps the option a chit inside the popover slab. */
        root: {
            class: [
                "focus:bg-accent focus:text-accent-foreground active:bg-accent-active active:text-accent-foreground data-[state=checked]:bg-primary/10 [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
            ],
        },
    },
});
