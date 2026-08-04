/**
 * @module theme/vueda-tailwind/shell/FieldSet.theme
 *
 * Per-component theme registration for FieldSet. Imported as a side effect by
 * FieldSet.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * FieldSet stacks related fields inside a fieldset.
     */
    FieldSet: {
        /**
         * The stack for a fieldset's child fields. It uses the default field rhythm and tightens spacing when the direct child is a checkbox or radio group.
         */
        root: {
            class: [
                "flex flex-col gap-6",
                "has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
            ],
        },
    },
});
