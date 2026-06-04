/**
 * @module theme/vueda-tailwind/shell/DrawerDescription.theme
 *
 * Per-component theme registration for DrawerDescription. Imported as a side effect by
 * DrawerDescription.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the DrawerDescription slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DrawerDescription styles supporting text inside a drawer.
     */
    DrawerDescription: {
        /**
         * The supporting copy inside a drawer. It uses muted small text to stay subordinate to the drawer title and body content.
         */
        root: {
            class: "text-muted-foreground text-sm",
        },
    },
});
