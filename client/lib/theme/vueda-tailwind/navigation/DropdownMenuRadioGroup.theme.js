/**
 * @module theme/vueda-tailwind/navigation/DropdownMenuRadioGroup.theme
 *
 * Per-component theme registration for DropdownMenuRadioGroup. Imported as a side effect by
 * DropdownMenuRadioGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/theme/vueda-tailwind/registry.js";

patchTheme({
    /**
     * DropdownMenuRadioGroup groups mutually exclusive dropdown menu choices.
     */
    DropdownMenuRadioGroup: {
        /** Semantic radio group only. Individual options own their indicator offset. */
        root: { class: "" },
    },
});
