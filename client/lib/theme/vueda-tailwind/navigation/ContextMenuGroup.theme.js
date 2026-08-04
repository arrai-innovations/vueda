/**
 * @module theme/vueda-tailwind/navigation/ContextMenuGroup.theme
 *
 * Per-component theme registration for ContextMenuGroup. Imported as a side effect by
 * ContextMenuGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ContextMenuGroup groups related context menu items.
     */
    ContextMenuGroup: {
        /** Semantic grouping only. See also: {@api theme-key:DropdownMenuGroup.root}. */
        root: { class: "" },
    },
});
