/**
 * @module theme/vueda-tailwind/controls/TagsInput.theme
 *
 * Per-component theme registration for TagsInput. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Multi-value input that captures discrete entries (tags, emails,
     * keywords) as pill chips. The text input grows in the same shell as the
     * committed chips.
     */
    TagsInput: {
        /** The outer shell of a multi-value input that captures discrete entries as pill chips. Reads as the input family: `hairline` border, control radius, `shadow-vueda-control` micro-shadow, dark-mode `bg-input/30` tint. Flex-wrap with an 8px gap so committed {@api theme-key:TagsInputItem.root} chips and the trailing {@api theme-key:TagsInputInput.root} flow onto new rows as the chip count grows. Focus and `aria-invalid` rings fire on the shell (not the inner input) via `:has(input:focus-visible)` and `:has([data-state=active])` selectors: typing in the field paints the standard focus ring on the shell; focusing a committed chip (`data-state=active`) suppresses the shell ring so the chip's own active outline is the only one visible at a time. */
        root: {
            class: [
                // Shell and surface.
                "flex flex-wrap gap-2 items-center rounded-vueda-field hairline bg-background dark:bg-input/30 px-2 py-1 text-sm shadow-vueda-control transition-shadow",

                // Focus and invalid states.
                "has-[input:focus-visible]:hairline-ring [&:has(input:focus-visible):not(:has([data-state=active]))]:focus-ring-shadow",
                "aria-invalid:hairline-destructive [&[aria-invalid]:has(input:focus-visible):not(:has([data-state=active]))]:focus-ring-shadow-destructive",
            ],
        },
    },
});
