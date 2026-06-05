/**
 * @module theme/vueda-tailwind/controls/NumberFieldInput.theme
 *
 * Per-component theme registration for NumberFieldInput. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Numeric `<input>` inside NumberField. Mono + tabular numerals,
     * centre-aligned, so digit widths stay stable during step changes.
     */
    NumberFieldInput: {
        /** The numeric `<input>` itself. Same hairline + focus shell as {@api theme-key:Input.root}, but renders in mono + tabular numerals and centres the value so digit widths stay stable while a stepper cycles through different-length numbers. Mono is the segment-as-token treatment shared with the date / time fields. */
        root: {
            class: [
                "flex h-vueda-control w-full rounded-vueda-control hairline bg-transparent font-mono tabular-nums text-sm text-center shadow-vueda-control transition-shadow placeholder:text-muted-foreground focus-visible:hairline-ring focus-visible:focus-ring-shadow disabled:cursor-not-allowed disabled:opacity-50",
            ],
        },
    },
});
