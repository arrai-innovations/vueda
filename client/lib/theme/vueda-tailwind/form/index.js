/**
 * @module theme/vueda-tailwind/form
 * @description Tailwind CSS pass-through theme configuration for VUEDA Client form layout and field-set components.
 */

export default {
    FieldSetMany: {
        root: {
            class: [
                "bg-card border rounded-vueda-card overflow-clip",
                "[[data-vueda-fieldset]_&]:border-0 [[data-vueda-fieldset]_&]:shadow-[inset_0_0_0_1px_var(--border)]",
            ],
        },
        inner: {
            class: ["flex flex-col p-3 gap-2"],
        },
        label: {
            class: [
                "leading-none",
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em] text-muted-foreground",
            ],
        },
        header: {
            class: [
                "flex items-center justify-between gap-2 px-3 py-2 -mx-3 -mt-3 mb-1 border-b border-border",
                "[[data-vueda-fieldset]_&]:bg-[color-mix(in_oklab,var(--muted)_20%,var(--card))]",
            ],
        },
        row: {
            class: ["flex", "flex-wrap", "gap-1", "2xs:gap-2", "flex-row"],
        },
        component: {
            class: ["w-5/6"],
        },
        createButton: {
            class: [],
        },
    },
    FieldSetRange: {
        root: {
            class: [
                "bg-card border rounded-vueda-card overflow-clip p-3",
                "[[data-vueda-fieldset]_&]:border-0 [[data-vueda-fieldset]_&]:shadow-[inset_0_0_0_1px_var(--border)]",
            ],
        },
        inner: {
            class: ["flex flex-row flex-wrap gap-1 2xs:gap-2"],
        },
        header: {
            class: ["flex items-baseline gap-1 2xs:gap-2"],
        },
        title: {
            class: [
                "leading-none",
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em] text-muted-foreground",
            ],
        },
        label: {
            class: [
                "leading-none",
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em] text-muted-foreground",
            ],
        },
        field: {
            class: [
                // "rounded", "px-1 lg:px-2 py-1 lg:py-2", "mb-2 lg:mb-4"
            ],
        },
    },
    FieldSetStackedInline: {
        root: {
            class: [
                "bg-card border rounded-vueda-card overflow-clip",
                "[[data-vueda-fieldset]_&]:border-0 [[data-vueda-fieldset]_&]:shadow-[inset_0_0_0_1px_var(--border)]",
            ],
        },
        inner: {
            class: ["flex flex-col p-3 gap-2"],
        },
        hr: {
            class: "hidden",
        },
        titleBar: {
            class: [
                "flex items-center gap-2 2xs:gap-3 px-3 py-2 -mx-3 -mt-3 mb-1 border-b border-border",
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em] leading-none text-muted-foreground",
                "[[data-vueda-fieldset]_&]:bg-[color-mix(in_oklab,var(--muted)_20%,var(--card))]",
            ],
        },
        title: {
            class: [],
        },
        field: {
            class: [
                // "rounded", "px-1 lg:px-2 py-1 lg:py-2",
                "min-w-1",
            ],
        },
        inlineRows: {
            class: ["flex flex-col gap-2"],
        },
        inlineRow: {},
        inLineCreateButton: {
            class: ["!w-full h-full"],
        },
        toggleButton: {
            class: [],
        },
        actionBar: {
            class: "grow-0 flex gap-1 2xs:gap-2 2xl:gap-4 ml-auto",
        },
        itemActionBar: {
            class: "flex gap-1 2xs:gap-2 2xl:gap-4 items-baseline",
        },
        createButton: {
            class: [],
        },
    },
    FieldSetStackedInlineRow: {
        root: {
            class: [
                "flex items-start gap-3 border rounded-vueda-card p-2.5",
                "data-[state=dirty]:border-l-2 data-[state=dirty]:border-l-primary",
                "data-[state=selected-for-destroy]:bg-destructive/5 data-[state=selected-for-destroy]:border-destructive/40",
            ],
        },
        beforeFields: {
            class: ["w-6 shrink-0"],
        },
        afterFields: {
            class: ["shrink-0"],
        },
        fieldInner: {
            class: [],
        },
        field: {
            class: [
                // "rounded", "px-1 lg:px-2 py-1 lg:py-2", "mb-2 lg:mb-4"
            ],
        },
        fields: {
            class: ["flex-1 min-w-0"],
        },
        actionBarOuter: {
            class: ["flex gap-1 2xs:gap-2 items-start shrink-0"],
        },
    },
    FieldSetTabularInline: {
        root: {
            class: [
                "bg-card border rounded-vueda-card overflow-clip",
                "[[data-vueda-fieldset]_&]:border-0 [[data-vueda-fieldset]_&]:shadow-[inset_0_0_0_1px_var(--border)]",
            ],
        },
        inner: {
            class: ["flex flex-col"],
        },
        hr: {
            class: "hidden",
        },
        titleBar: {
            class: [
                "flex items-center gap-2 2xs:gap-3 px-3 py-2 border-b border-border",
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em] leading-none text-muted-foreground",
                "[[data-vueda-fieldset]_&]:bg-[color-mix(in_oklab,var(--muted)_20%,var(--card))]",
            ],
        },
        title: {
            class: [],
        },
        actionBar: {
            class: "grow-0 flex gap-1 2xs:gap-2 2xl:gap-4 ml-auto",
        },
        itemActionBar: {
            class: "flex gap-1 2xs:gap-2 2xl:gap-4 items-baseline",
        },
        objectsGrid: {
            class: "w-full",
        },
        objectsGridHidden: {
            class: "hidden",
        },
        field: {
            class: [
                // "rounded", "px-1 lg:px-2 py-1 lg:py-2",
                "min-w-1",
            ],
        },
        fieldInner: {
            class: [],
        },
        createButton: {
            class: [],
        },
        inLineCreateButton: {
            class: ["!w-full h-full"],
        },
        toggleButton: {
            class: [],
        },
        createButtonCard: {
            class: "border-dashed",
        },
        themeOverride: {
            ObjectsGridBodyCell: {
                root: {
                    class: "min-w-36",
                },
            },
        },
    },
    FilterForm: {
        dialog: {
            class: "w-64",
        },
        form: {
            class: "flex flex-col gap-1 2xs:gap-2 2xl:gap-4",
        },
        fieldContainer: {
            class: "mb-2",
        },
        fieldLabel: {
            class: [],
        },
        fieldInput: {
            class: "rounded border border-neutral-300 dark:border-neutral-600 p-1 2xs:p-2",
        },
        submitButton: {
            class: "whitespace-nowrap",
        },
        createButtonContainer: {
            class: "flex justify-end mt-2",
        },
        filterListContainer: {
            class: "flex flex-wrap gap-1 my-1",
        },
        filterButton: {
            class: "grow sm:grow-0",
        },
        errorDisplay: {
            class: "mb-2",
        },
        hr: {
            class: "flex-1 border-neutral-300 dark:border-neutral-600 border-t",
        },
        message: {
            class: "text-red-600 dark:text-red-400",
        },
    },
    FormMessage: {
        root: {
            class: ["my-2"],
        },
        list: {
            class: ["list-disc list-inside"],
        },
    },
    FormModel: {
        root: {
            class: [],
        },
        inner: {
            class: ["flex flex-col"],
        },
        label: {
            class: ["ml-2 leading-7", "text-neutral-900/60 dark:text-white/60"],
        },
        beforeFields: {
            class: [],
        },
        afterFields: {
            class: [],
        },
        fields: {
            class: [],
        },
        field: {
            class: [
                // "rounded", "px-1 lg:px-2 py-1 lg:py-2", "mb-2 lg:mb-4"
            ],
        },
        fieldInner: {
            class: [],
        },
    },
    FormSection: {
        root: {
            class: ["flex flex-col gap-3.5 pt-1", "[&+&]:mt-2 [&+&]:border-t [&+&]:border-border [&+&]:pt-4"],
        },
    },
    FormSectionTitle: {
        root: {
            class: "flex items-baseline gap-3 font-semibold text-sm",
        },
    },
    FormActions: {
        root: {
            class: "flex flex-wrap gap-2 pt-2 mt-1",
        },
        spacer: {
            class: "flex-1",
        },
    },
    FormHiddenFeedback: {
        root: {
            class: "min-w-min",
        },
        popoverBody: {
            class: "flex flex-col gap-1 md:gap-2 2xl:gap-4",
        },
        popoverItem: {
            class: [],
        },
        button: {
            class: [],
        },
        icon: {
            class: [],
        },
        required: {
            class: [],
        },
        errors: {
            class: [],
        },
        warnings: {
            class: [],
        },
        help: {
            class: [],
        },
    },
};
