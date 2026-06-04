/**
 * @module theme/vueda-tailwind/shell/CardHeader.theme
 *
 * Per-component theme registration for CardHeader. Imported as a side effect by
 * CardHeader.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the CardHeader slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * CardHeader lays out the leading card title area and optional action.
     */
    CardHeader: {
        /**
         * The leading card header grid. It creates title and description rows and switches to a two-column layout when {@api theme-key:CardAction.root} is present.
         */
        root: {
            class: "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        },
    },
});
