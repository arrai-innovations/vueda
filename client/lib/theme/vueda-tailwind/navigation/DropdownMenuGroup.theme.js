/**
 * @module theme/vueda-tailwind/navigation/DropdownMenuGroup.theme
 *
 * Per-component theme registration for DropdownMenuGroup. Imported as a side effect by
 * DropdownMenuGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the DropdownMenuGroup slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DropdownMenuGroup groups related dropdown menu items.
     */
    DropdownMenuGroup: {
        /** Semantic grouping only. Item spacing and dividers are owned by child item and separator slots. */
        root: { class: "" },
    },
});
