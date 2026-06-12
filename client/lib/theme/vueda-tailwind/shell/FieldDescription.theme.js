/**
 * @module theme/vueda-tailwind/shell/FieldDescription.theme
 *
 * Per-component theme registration for FieldDescription. Imported as a side effect by
 * FieldDescription.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * FieldDescription styles helper text and explanatory links for a field.
     */
    FieldDescription: {
        /**
         * The helper text beneath or beside a field control. It uses supporting text size, muted color, and link styling that keeps explanatory copy readable without becoming the primary label.
         */
        root: {
            class: [
                // Type and color.
                "text-muted-foreground text-[length:var(--vueda-text-supporting)] leading-[1.4] font-normal",

                // Orientation state.
                "group-has-[[data-orientation=horizontal]]/field:text-balance",

                // Spacing states.
                "last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5",

                // Link states.
                "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
            ],
        },
    },
});
