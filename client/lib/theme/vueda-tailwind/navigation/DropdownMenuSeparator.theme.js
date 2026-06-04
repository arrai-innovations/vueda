/**
 * @module theme/vueda-tailwind/navigation/DropdownMenuSeparator.theme
 *
 * Per-component theme registration for DropdownMenuSeparator. Imported as a side effect by
 * DropdownMenuSeparator.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the DropdownMenuSeparator slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DropdownMenuSeparator renders a divider between dropdown menu sections.
     */
    DropdownMenuSeparator: {
        /** Full-width menu divider that bleeds through the content padding. */
        root: {
            class: "bg-border -mx-1 my-1 h-px",
        },
    },
});
