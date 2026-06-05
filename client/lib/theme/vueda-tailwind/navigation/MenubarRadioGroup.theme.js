/**
 * @module theme/vueda-tailwind/navigation/MenubarRadioGroup.theme
 *
 * Per-component theme registration for MenubarRadioGroup. Imported as a side effect by
 * MenubarRadioGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
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
