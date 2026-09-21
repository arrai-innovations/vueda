/**
 * @module theme/vueda-tailwind/controls/InputGroup.theme
 *
 * Per-component theme registration for InputGroup. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Wrapper that joins an Input (or Textarea) with one or more addons (icon,
     * button, kbd, helper text) into a single bordered shell. The group owns
     * the hairline and focus-ring; children render without borders of their
     * own.
     */
    InputGroup: {
        /** The shell that joins an input (or textarea) with one or more addons (icon, button, kbd, helper line) into a single bordered chip. The group, not its children, owns the hairline and focus ring: child controls strip their own chrome (see {@api theme-key:InputGroupInput} / {@api theme-key:InputGroupTextarea}) and the group reacts to `focus-visible` on any `[data-slot=input-group-control]` and to `aria-invalid` on any tagged child via `:has(...)` selectors. Inline addons (`align=inline-start` / `inline-end`) stay on a single row at `h-vueda-control`; block addons (`align=block-start` / `block-end`) stack and flip the row to `flex-col` with auto height, so the same shell supports left/right glyphs and top/bottom helper rows. */
        root: {
            class: [
                // Shell and surface.
                "group/input-group field-line bg-field hover:bg-field-hover relative flex w-full items-center",
                "rounded-vueda-field shadow-vueda-control transition-shadow",

                // Sizing.
                "h-vueda-control min-w-0 has-[>textarea]:h-auto",

                // Inline addon spacing.
                "has-[>[data-align=inline-start]]:[&>input]:pl-2",
                "has-[>[data-align=inline-end]]:[&>input]:pr-2",

                // Block addon spacing.
                "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3",
                "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3",

                // Focus and invalid states.
                "has-[[data-slot=input-group-control]:focus-visible]:hairline-ring has-[[data-slot=input-group-control]:focus-visible]:focus-ring-shadow",
                "has-[[data-slot][aria-invalid=true]]:hairline-destructive has-[[data-slot][aria-invalid=true]:focus-visible]:focus-ring-shadow-destructive",
            ],
        },
    },
});
