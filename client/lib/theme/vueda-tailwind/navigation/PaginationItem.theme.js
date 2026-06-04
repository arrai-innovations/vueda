/**
 * @module theme/vueda-tailwind/navigation/PaginationItem.theme
 *
 * Per-component theme registration for PaginationItem. Imported as a side effect by
 * PaginationItem.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the PaginationItem slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import "@vueda/theme/vueda-tailwind/controls/_ButtonPrimitives.theme.js";
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * PaginationItem styles a numbered pagination control and its active state.
     */
    PaginationItem: {
        /** Numbered page control. Composes the Button base and switches between outline active and ghost inactive variants. */
        root: ({ isActive }) => ({
            composes: ["_ButtonBase.root", isActive ? "_ButtonOutline.root" : "_ButtonGhost.root"],
            class: [],
        }),
    },
});
