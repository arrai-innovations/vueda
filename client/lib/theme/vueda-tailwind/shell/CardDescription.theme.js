/**
 * @module theme/vueda-tailwind/shell/CardDescription.theme
 *
 * Per-component theme registration for CardDescription. Imported as a side effect by
 * CardDescription.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the CardDescription slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * CardDescription styles secondary explanatory text inside a card header.
     */
    CardDescription: {
        /**
         * The secondary card header copy. It uses muted body text for explanatory text below {@api theme-key:CardTitle.root}.
         */
        root: {
            class: "text-muted-foreground text-body",
        },
    },
});
