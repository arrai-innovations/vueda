/**
 * @module theme/vueda-tailwind/navigation/ContextMenuGroup.theme
 *
 * Per-component theme registration for ContextMenuGroup. Imported as a side effect by
 * ContextMenuGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the ContextMenuGroup slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
