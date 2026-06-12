/**
 * @module theme/vueda-tailwind/controls/ComboboxGroup.theme
 *
 * Per-component theme registration for ComboboxGroup. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Section of related items inside ComboboxList, optionally with a
     * heading. The heading slot renders the caps-mono-micro eyebrow recipe.
     */
    ComboboxGroup: {
        /** A section of related {@api theme-key:ComboboxItem.root} rows inside {@api theme-key:ComboboxList.root}. 4px padding (`p-1`) carries the breathing room around the section so consecutive groups read as separate runs even without a {@api theme-key:ComboboxSeparator.root} between them; `overflow-hidden` clips a long inner row to the group's box rather than letting it bleed into a neighbour. */
        root: {
            class: ["overflow-hidden p-1 text-foreground"],
        },
        /** The optional heading row above a group's items. Renders the caps-mono-micro eyebrow recipe (mono, weight 600, micro size, uppercase, 0.04em tracking) on `--muted-foreground` so the label reads as a section eyebrow rather than as a result row. Same recipe as {@api theme-key:SelectLabel.root} and {@api theme-key:CommandGroup.heading} so all three pickers share one eyebrow voice. */
        heading: {
            class: [
                // Layout and type.
                "text-muted-foreground px-2 py-1.5 font-mono",
                "text-[length:var(--vueda-text-micro)] font-semibold leading-none tracking-[0.04em] uppercase",
            ],
        },
    },
});
