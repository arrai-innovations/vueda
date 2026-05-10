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
            class: ["group/many-row grid grid-cols-[1fr_auto] items-center gap-1 2xs:gap-2"],
        },
        component: {
            class: ["min-w-0"],
        },
        removeButton: {
            class: [
                "flex items-center justify-center",
                "opacity-0 transition-opacity",
                "group-hover/many-row:opacity-100 group-focus-within/many-row:opacity-100",
            ],
        },
        footer: {
            class: ["flex justify-end mt-0.5"],
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
            class: ["grid items-center gap-1 2xs:gap-2", "grid-cols-1 sm:grid-cols-[1fr_16px_1fr]"],
        },
        header: {
            class: ["flex items-baseline gap-1 2xs:gap-2 mb-1"],
        },
        separator: {
            class: [
                "hidden sm:flex items-center justify-center text-muted-foreground",
                "h-8 w-4 select-none leading-none",
            ],
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
        choresPanel: {
            class: [
                "-mx-3 -mb-3 mt-3 px-3 py-2 border-t border-border",
                "bg-[color-mix(in_oklab,var(--muted)_15%,var(--card))]",
                "flex flex-col gap-1",
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
        titleBarToggle: {
            class: [
                "cursor-pointer select-none",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "transition-colors",
            ],
        },
        toggleIndicator: {
            class: ["inline-flex items-center justify-center shrink-0 size-4", "transition-transform duration-150"],
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
        choresPanel: {
            class: [
                "-mx-3 -mb-3 px-3 py-2 border-t border-border",
                "bg-[color-mix(in_oklab,var(--muted)_15%,var(--card))]",
                "flex flex-col gap-1",
            ],
        },
        emptyState: {
            class: [
                "flex flex-col items-center justify-center gap-2",
                "py-8 px-6 text-center",
                "rounded-vueda-card border-2 border-dashed border-border bg-muted/30",
            ],
        },
        emptyStateIcon: {
            class: [
                "flex items-center justify-center",
                "size-9 rounded-full bg-muted text-muted-foreground",
                "text-[length:var(--vueda-text-title)] leading-none",
            ],
        },
        emptyStateTitle: {
            class: ["text-[length:var(--vueda-text-reading)] font-semibold leading-snug text-foreground"],
        },
        emptyStateDesc: {
            class: [
                "text-[length:var(--vueda-text-supporting)] font-normal leading-normal text-muted-foreground max-w-[44ch]",
            ],
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
        titleBarToggle: {
            class: [
                "cursor-pointer select-none",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "transition-colors",
            ],
        },
        toggleIndicator: {
            class: ["inline-flex items-center justify-center shrink-0 size-4", "transition-transform duration-150"],
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
        choresPanel: {
            class: [
                "px-3 py-2 border-t border-border",
                "bg-[color-mix(in_oklab,var(--muted)_15%,var(--card))]",
                "flex flex-col gap-1",
            ],
        },
        emptyState: {
            class: [
                "flex flex-col items-center justify-center gap-2",
                "m-3 py-8 px-6 text-center",
                "rounded-vueda-card border-2 border-dashed border-border bg-muted/30",
            ],
        },
        emptyStateIcon: {
            class: [
                "flex items-center justify-center",
                "size-9 rounded-full bg-muted text-muted-foreground",
                "text-[length:var(--vueda-text-title)] leading-none",
            ],
        },
        emptyStateTitle: {
            class: ["text-[length:var(--vueda-text-reading)] font-semibold leading-snug text-foreground"],
        },
        emptyStateDesc: {
            class: [
                "text-[length:var(--vueda-text-supporting)] font-normal leading-normal text-muted-foreground max-w-[44ch]",
            ],
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
