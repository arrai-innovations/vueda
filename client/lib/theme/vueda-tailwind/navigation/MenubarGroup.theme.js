/**
 * @module theme/vueda-tailwind/navigation/MenubarGroup.theme
 *
 * Per-component theme registration for MenubarGroup. Imported as a side effect by
 * MenubarGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the MenubarGroup slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * MenubarGroup groups related menubar items.
     */
    MenubarGroup: {
        /** Semantic grouping only inside menubar content. See also: {@api theme-key:DropdownMenuGroup.root}. */
        root: { class: "" },
    },
});
