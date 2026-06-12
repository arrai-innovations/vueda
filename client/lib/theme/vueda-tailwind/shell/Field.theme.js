/**
 * @module theme/vueda-tailwind/shell/Field.theme
 *
 * Per-component theme registration for Field. Imported as a side effect by
 * Field.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Field styles the outer wrapper for form field labels, controls, descriptions, and messages.
     */
    Field: {
        /**
         * The outer field layout wrapper. It switches between vertical, horizontal, responsive, and read-only grid layouts while carrying invalid state color.
         */
        root: ({ orientation }) => {
            const base = "group/field flex w-full gap-3 data-[invalid=true]:text-destructive";
            if (orientation === "horizontal") {
                return {
                    class: [
                        // Base and orientation.
                        base,
                        "flex-row items-start",

                        // Label sizing.
                        "[&>[data-slot=field-label]]:basis-48 [&>[data-slot=field-label]]:max-w-[40%] [&>[data-slot=field-label]]:min-w-0 [&>[data-slot=field-label]]:shrink",

                        // Label alignment.
                        "[&>[data-slot=field-label]]:pt-2 [&>[data-slot=field-label]]:text-right [&>[data-slot=field-label]]:justify-end",

                        // Nested control alignment.
                        "has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
                    ],
                };
            }
            if (orientation === "responsive") {
                return {
                    class: [
                        // Base and mobile layout.
                        base,
                        "flex-col [&>*]:w-full [&>.sr-only]:w-auto",

                        // Responsive layout.
                        "@md/field-group:flex-row @md/field-group:items-start @md/field-group:[&>*]:w-auto",

                        // Responsive label sizing.
                        "@md/field-group:[&>[data-slot=field-label]]:basis-48 @md/field-group:[&>[data-slot=field-label]]:max-w-[40%] @md/field-group:[&>[data-slot=field-label]]:min-w-0 @md/field-group:[&>[data-slot=field-label]]:shrink",

                        // Responsive label alignment.
                        "@md/field-group:[&>[data-slot=field-label]]:pt-2 @md/field-group:[&>[data-slot=field-label]]:text-right @md/field-group:[&>[data-slot=field-label]]:justify-end",

                        // Responsive nested control alignment.
                        "@md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
                    ],
                };
            }
            if (orientation === "read") {
                return {
                    class: [
                        // Layout and spacing.
                        "group/field grid w-full grid-cols-[180px_1fr] items-start gap-x-5 gap-y-2 py-2",

                        // Border and state.
                        "border-b data-[invalid=true]:text-destructive",

                        // Label type.
                        "[&>[data-slot=field-label]]:text-[12px] [&>[data-slot=field-label]]:font-medium [&>[data-slot=field-label]]:leading-[1.5] [&>[data-slot=field-label]]:text-muted-foreground",

                        // Label spacing.
                        "[&>[data-slot=field-label]]:pt-px",
                    ],
                };
            }
            // vertical (default)
            return {
                class: [base, "flex-col [&>*]:w-full [&>.sr-only]:w-auto"],
            };
        },
    },
});
