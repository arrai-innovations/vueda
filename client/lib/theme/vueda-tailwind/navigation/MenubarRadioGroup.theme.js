/**
 * @module theme/vueda-tailwind/navigation/MenubarRadioGroup.theme
 *
 * Per-component theme registration for MenubarRadioGroup. Imported as a side effect by
 * MenubarRadioGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the MenubarRadioGroup slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * MenubarRadioGroup groups mutually exclusive menubar choices.
     */
    MenubarRadioGroup: {
        /** Semantic radio group only inside menubar content. See also: {@api theme-key:DropdownMenuRadioGroup.root}. */
        root: { class: "" },
    },
});
