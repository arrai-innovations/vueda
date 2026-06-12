/**
 * @module theme/vueda-tailwind/shell/FieldTitle.theme
 *
 * Per-component theme registration for FieldTitle. Imported as a side effect by
 * FieldTitle.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * FieldTitle styles compact field-adjacent heading text.
     */
    FieldTitle: {
        /**
         * The compact title text adjacent to field content. It follows field disabled opacity and uses label-weight type for local field headings.
         */
        root: {
            class: [
                // Layout and type.
                "flex w-fit items-center gap-2 text-sm leading-snug font-medium",

                // Disabled state.
                "group-data-[disabled=true]/field:opacity-50",
            ],
        },
    },
});
