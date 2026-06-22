/**
 * @module theme/vueda-tailwind/navigation/ContextMenuRadioGroup.theme
 *
 * Per-component theme registration for ContextMenuRadioGroup. Imported as a side effect by
 * ContextMenuRadioGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
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
