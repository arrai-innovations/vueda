/**
 * @module theme/vueda-tailwind/controls/CommandItem.theme
 *
 * Per-component theme registration for CommandItem. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Individual result row inside a Command. Same highlight recipe as
     * ComboboxItem.
     */
    CommandItem: {
        /** A single result row inside a {@api theme-key:CommandGroup.root}. See also: {@api theme-key:ComboboxItem.root}; identical highlight + disabled + icon-tint recipe so result rows feel the same across both pickers. Command differs only at the row's trailing edge, where {@api theme-key:CommandShortcut.root} (rather than {@api theme-key:ComboboxItemIndicator.root}) marks the kbd hint for invoking the action. */
        root: {
            class: [
                "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            ],
        },
    },
});
