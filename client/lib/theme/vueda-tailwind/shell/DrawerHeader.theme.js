/**
 * @module theme/vueda-tailwind/shell/DrawerHeader.theme
 *
 * Per-component theme registration for DrawerHeader. Imported as a side effect by
 * DrawerHeader.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the DrawerHeader slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DrawerHeader groups drawer title and description content.
     */
    DrawerHeader: {
        /**
         * The title and description stack inside a drawer. It applies the drawer's default 16px inset and compact vertical gap.
         */
        root: {
            class: "flex flex-col gap-1.5 p-4",
        },
    },
});
