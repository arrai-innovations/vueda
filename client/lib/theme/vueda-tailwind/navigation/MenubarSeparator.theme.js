/**
 * @module theme/vueda-tailwind/navigation/MenubarSeparator.theme
 *
 * Per-component theme registration for MenubarSeparator. Imported as a side effect by
 * MenubarSeparator.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the MenubarSeparator slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * MenubarSeparator renders a divider between menubar sections.
     */
    MenubarSeparator: {
        /** Menubar content divider that bleeds through menu padding. See also: {@api theme-key:DropdownMenuSeparator.root}. */
        root: {
            class: "bg-border -mx-1 my-1 h-px",
        },
    },
});
