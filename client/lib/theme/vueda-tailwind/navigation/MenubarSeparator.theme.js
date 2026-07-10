/**
 * @module theme/vueda-tailwind/navigation/MenubarSeparator.theme
 *
 * Per-component theme registration for MenubarSeparator. Imported as a side effect by
 * MenubarSeparator.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * MenubarSeparator renders a divider between menubar sections.
     */
    MenubarSeparator: {
        /** Menubar content divider that bleeds through menu padding. See also: {@api theme-key:DropdownMenuSeparator.root}. */
        root: {
            class: "bg-border -mx-1 my-1 h-hairline",
        },
    },
});
