/**
 * @module theme/vueda-tailwind/shell/DialogFooter.theme
 *
 * Per-component theme registration for DialogFooter. Imported as a side effect by
 * DialogFooter.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the DialogFooter slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * DialogFooter arranges dialog actions with responsive stacking.
     */
    DialogFooter: {
        /**
         * The action row for dialog footers. It stacks in reverse order on narrow screens and aligns trailing actions on wider screens.
         */
        root: {
            class: "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        },
    },
});
