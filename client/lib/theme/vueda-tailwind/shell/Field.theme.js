/**
 * @module theme/vueda-tailwind/shell/Field.theme
 *
 * Per-component theme registration for Field. Imported as a side effect by
 * Field.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the Field slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
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
                        base,
                        "flex-row items-start",
                        "[&>[data-slot=field-label]]:w-48 [&>[data-slot=field-label]]:shrink-0 [&>[data-slot=field-label]]:pt-2 [&>[data-slot=field-label]]:text-right [&>[data-slot=field-label]]:justify-end",
                        "has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
                    ],
                };
            }
            if (orientation === "responsive") {
                return {
                    class: [
                        base,
                        "flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:flex-row @md/field-group:items-start @md/field-group:[&>*]:w-auto",
                        "@md/field-group:[&>[data-slot=field-label]]:w-48 @md/field-group:[&>[data-slot=field-label]]:shrink-0 @md/field-group:[&>[data-slot=field-label]]:pt-2 @md/field-group:[&>[data-slot=field-label]]:text-right @md/field-group:[&>[data-slot=field-label]]:justify-end",
                        "@md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
                    ],
                };
            }
            if (orientation === "read") {
                return {
                    class: [
                        "group/field grid w-full grid-cols-[180px_1fr] items-start gap-x-5 gap-y-2 py-2 border-b border-border data-[invalid=true]:text-destructive",
                        "[&>[data-slot=field-label]]:text-[12px] [&>[data-slot=field-label]]:font-medium [&>[data-slot=field-label]]:leading-[1.5] [&>[data-slot=field-label]]:text-muted-foreground [&>[data-slot=field-label]]:pt-px",
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
