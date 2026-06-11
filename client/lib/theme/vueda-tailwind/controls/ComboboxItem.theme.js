/**
 * @module theme/vueda-tailwind/controls/ComboboxItem.theme
 *
 * Per-component theme registration for ComboboxItem. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Individual result row inside a Combobox. Highlighted by `--accent` when
     * focused; muted icon flips to `--accent-foreground` on highlight.
     */
    ComboboxItem: {
        /** A single result row inside a {@api theme-key:ComboboxGroup.root}. The `data-highlighted` state (set by the picker on keyboard or pointer focus) paints `--accent` / `--accent-foreground`, and the muted leading icon flips to inherit on the same rule so a highlighted row reads as one tinted strip. `data-disabled` halves opacity and drops pointer events; `rounded-sm` keeps the row a chit inside the group's slab. The committed-value `data-state=checked` tint that {@api theme-key:SelectItem.root} carries is not applied here because Combobox commits by closing the popover; the trailing {@api theme-key:ComboboxItemIndicator.root} marks the selection instead. */
        root: {
            class: [
                "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground active:bg-accent-active active:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },
});
