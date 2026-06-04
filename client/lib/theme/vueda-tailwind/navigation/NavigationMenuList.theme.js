/**
 * @module theme/vueda-tailwind/navigation/NavigationMenuList.theme
 *
 * Per-component theme registration for NavigationMenuList. Imported as a side effect by
 * NavigationMenuList.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the NavigationMenuList slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * NavigationMenuList arranges top-level navigation menu items.
     */
    NavigationMenuList: {
        /** Top-level list row for navigation menu items, with reset list styling and compact gaps. */
        root: {
            class: "group flex flex-1 list-none items-center justify-center gap-1",
        },
    },
});
