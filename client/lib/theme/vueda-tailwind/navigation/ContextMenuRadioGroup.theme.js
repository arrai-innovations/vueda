/**
 * @module theme/vueda-tailwind/navigation/ContextMenuRadioGroup.theme
 *
 * Per-component theme registration for ContextMenuRadioGroup. Imported as a side effect by
 * ContextMenuRadioGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the ContextMenuRadioGroup slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ContextMenuRadioGroup groups mutually exclusive context menu choices.
     */
    ContextMenuRadioGroup: {
        /** Semantic radio group only. See also: {@api theme-key:DropdownMenuRadioGroup.root}. */
        root: { class: "" },
    },
});
