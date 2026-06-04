/**
 * @module theme/vueda-tailwind/shell/CardFooter.theme
 *
 * Per-component theme registration for CardFooter. Imported as a side effect by
 * CardFooter.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the CardFooter slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * CardFooter arranges trailing card actions or metadata.
     */
    CardFooter: {
        /**
         * The trailing card footer row. It aligns footer content horizontally and adds top padding only when the footer also carries a top border.
         */
        root: {
            class: "flex items-center px-6 [.border-t]:pt-6",
        },
    },
});
