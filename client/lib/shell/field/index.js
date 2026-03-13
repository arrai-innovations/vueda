import { cva } from "class-variance-authority";

export const fieldVariants = cva("group/field flex w-full gap-3 data-[invalid=true]:text-destructive", {
    variants: {
        orientation: {
            vertical: ["flex-col [&>*]:w-full [&>.sr-only]:w-auto"],
            horizontal: [
                "flex-row items-center",
                "[&>[data-slot=field-label]]:flex-auto",
                "has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
            ],
            responsive: [
                "flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:flex-row @md/field-group:items-center @md/field-group:[&>*]:w-auto",
                "@md/field-group:[&>[data-slot=field-label]]:flex-auto",
                "@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
            ],
        },
    },
    defaultVariants: {
        orientation: "vertical",
    },
});

export { default as ShellField } from "./ShellField.vue";
export { default as ShellFieldContent } from "./ShellFieldContent.vue";
export { default as ShellFieldDescription } from "./ShellFieldDescription.vue";
export { default as ShellFieldError } from "./ShellFieldError.vue";
export { default as ShellFieldGroup } from "./ShellFieldGroup.vue";
export { default as ShellFieldLabel } from "./ShellFieldLabel.vue";
export { default as ShellFieldLegend } from "./ShellFieldLegend.vue";
export { default as ShellFieldSeparator } from "./ShellFieldSeparator.vue";
export { default as ShellFieldSet } from "./ShellFieldSet.vue";
export { default as ShellFieldTitle } from "./ShellFieldTitle.vue";
