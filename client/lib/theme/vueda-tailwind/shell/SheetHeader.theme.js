/**
 * @module theme/vueda-tailwind/shell/SheetHeader.theme
 *
 * Per-component theme registration for SheetHeader. Imported as a side effect by
 * SheetHeader.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the SheetHeader slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SheetHeader groups sheet title and description content.
     */
    SheetHeader: {
        /**
         * The title and description stack inside a sheet. It applies the sheet's default 16px inset and compact vertical gap.
         */
        root: {
            class: "flex flex-col gap-1.5 p-4",
        },
    },
});
