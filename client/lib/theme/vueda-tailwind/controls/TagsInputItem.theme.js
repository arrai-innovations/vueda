/**
 * @module theme/vueda-tailwind/controls/TagsInputItem.theme
 *
 * Per-component theme registration for TagsInputItem. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * An individual committed chip inside a TagsInput. Pill radius marks it
     * as a user-manipulated tag/chip object (versus slab-radius system
     * badges).
     */
    TagsInputItem: {
        /** An individual committed chip inside a {@api theme-key:TagsInput.root}. Pill radius (not the control / card radius the rest of the form family wears) marks the chip as a user-manipulated tag object rather than a slab-radius system badge or a chrome chit. Sized to `--vueda-chip-height` so multiple chips on a row share one baseline. `data-state=active` (set when the chip receives keyboard focus to edit or delete it) paints the standard focus ring on the chip, and the surrounding {@api theme-key:TagsInput.root} suppresses its own ring on the same condition so only one ring paints at a time. */
        root: {
            class: [
                // Chip shell and active state.
                "flex h-[var(--vueda-chip-height)] items-center rounded-vueda-pill bg-secondary data-[state=active]:focus-ring",
            ],
        },
    },
});
