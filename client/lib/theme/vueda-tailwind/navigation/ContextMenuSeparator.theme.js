/**
 * @module theme/vueda-tailwind/navigation/ContextMenuSeparator.theme
 *
 * Per-component theme registration for ContextMenuSeparator. Imported as a side effect by
 * ContextMenuSeparator.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ContextMenuSeparator renders a divider between context menu sections.
     */
    ContextMenuSeparator: {
        /** Context-menu divider that bleeds through menu padding. See also: {@api theme-key:DropdownMenuSeparator.root}. */
        root: {
            class: "bg-border -mx-1 my-1 h-hairline",
        },
    },
});
