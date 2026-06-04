/**
 * @module theme/vueda-tailwind/navigation/Menubar.theme
 *
 * Per-component theme registration for Menubar. Imported as a side effect by
 * Menubar.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the Menubar slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Menubar styles the horizontal root container for application menus.
     */
    Menubar: {
        /** Horizontal menu bar surface. It keeps the popover/menu family language while the bar shadow stays flat. */
        root: {
            class: "bg-background flex h-9 items-center gap-1 rounded-vueda-control border p-1 shadow-vueda-control",
        },
    },
});
