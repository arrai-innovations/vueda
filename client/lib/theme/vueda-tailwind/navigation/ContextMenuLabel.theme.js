/**
 * @module theme/vueda-tailwind/navigation/ContextMenuLabel.theme
 *
 * Per-component theme registration for ContextMenuLabel. Imported as a side effect by
 * ContextMenuLabel.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ContextMenuLabel styles a non-interactive label for a group of context menu items.
     */
    ContextMenuLabel: {
        /** Non-interactive context-menu group label. See also: {@api theme-key:DropdownMenuLabel.root}. */
        root: {
            class: "text-muted-foreground px-2 py-1.5 font-mono text-[length:var(--vueda-text-micro)] font-semibold leading-none tracking-[0.04em] uppercase data-[inset]:pl-8",
        },
    },
});
