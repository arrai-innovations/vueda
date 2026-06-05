/**
 * @module theme/vueda-tailwind/navigation/MenubarLabel.theme
 *
 * Per-component theme registration for MenubarLabel. Imported as a side effect by
 * MenubarLabel.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * MenubarLabel styles a non-interactive label for a group of menubar items.
     */
    MenubarLabel: {
        /** Non-interactive menubar group label. See also: {@api theme-key:DropdownMenuLabel.root}. */
        root: {
            class: "text-muted-foreground px-2 py-1.5 font-mono text-[length:var(--vueda-text-micro)] font-semibold leading-none tracking-[0.04em] uppercase data-[inset]:pl-8",
        },
    },
});
