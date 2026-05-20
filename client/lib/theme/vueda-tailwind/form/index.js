/**
 * @module theme/vueda-tailwind/form
 * @description Tailwind CSS pass-through theme configuration for VUEDA Client form layout and field-set components.
 */

export default {
    // ---------- Inline field sets ----------

    /**
     * Multi-value field wrapper that renders repeated child field instances.
     * Provides the card chrome, add/remove controls, and nested-fieldset
     * treatment for list-style form inputs.
     */
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

    /**
     * Paired-boundary field set for lower and upper range values. Groups the
     * two rendered fields, separator, and chores panel used by range filters
     * and form fields.
     */
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

    /**
     * Stacked inline editor for related objects. Owns the section header,
     * row stack, empty state, create/toggle actions, and field-set-level
     * validation panel.
     */
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

    /**
     * Single row inside a stacked inline field set. Lays out the row fields,
     * before/after hooks, and row-level action bar for create, destroy, and
     * selection controls.
     */
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

    /**
     * Tabular inline editor for related objects. Connects field-set chrome to
     * an `ObjectsGrid` body with create, toggle, destroy, and empty-state
     * controls.
     */
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
        body: {
            class: ["flex flex-col"],
        },
        objectsGrid: {
            class: "w-full",
        },
        objectsGridHidden: {
            class: "hidden",
        },
        destroyPill: {
            class: [
                "inline-flex items-center justify-center shrink-0",
                "px-1.5 h-5 rounded-vueda-control",
                "bg-destructive/10 text-destructive",
                "text-[10px] font-semibold uppercase tracking-[0.06em] leading-none",
                "[font-variant-numeric:tabular-nums]",
            ],
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

    // ---------- Filters ----------

    /**
     * Button-triggered filter popover for a single list filter. Styles the
     * clear/dropdown buttons and the popover body that hosts the filter form.
     */
    FilterComponent: {
        root: {},
        clearButton: {
            class: ({ hasFilterValue, errored }) => ({
                "!border-dashed": !hasFilterValue,
                "!border-red-500 !text-red-500": errored,
            }),
        },
        dropdownButton: {
            class: ({ hasFilterValue, errored }) => ({
                "!border-dashed": !hasFilterValue,
                "!border-red-500 !text-red-500": errored,
            }),
        },
        formPopover: {
            class: ["sm:min-w-[25%]"],
        },
    },

    /**
     * Form body rendered inside a filter popover. Provides the heading and
     * vertical layout for the filter field and submit action.
     */
    FilterForm: {
        outer: {
            class: ["flex flex-col"],
        },
        heading: {
            class: ["font-bold leading-relaxed"],
        },
    },

    /**
     * Filter toolbar for model list views. Arranges active filter controls,
     * message content, and the wrapper that hosts each `FilterComponent`.
     */
    FilterGroup: {
        root: {
            class: "flex-col ",
        },
        filtersWrapper: {
            class: "flex flex-wrap gap-1 mt-1",
        },
        messageWrapper: {
            class: "flex my-2",
        },
    },

    // ---------- Form feedback ----------

    /**
     * Form-level message block for non-field errors or warnings. Wraps the
     * alert body and optional list used when several messages are present.
     */
    FormMessage: {
        root: {
            class: ["my-2"],
        },
        list: {
            class: ["list-disc list-inside"],
        },
    },

    /**
     * Model-driven form container that renders configured fields. Provides the
     * field stack, optional label, and before/after hooks used by generated
     * create and update forms.
     */
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

    // ---------- Form layout ----------

    /**
     * Lightweight grouping section for long forms. Styles the section root,
     * title row, and trailing aside metadata above a slotted body.
     */
    FormSection: {
        root: {
            class: "flex flex-col gap-3 [&+&]:mt-2",
        },
        head: {
            class: "flex items-baseline justify-between gap-2 pb-1.5 border-b border-border",
        },
        aside: {
            class: "font-mono text-[length:var(--vueda-text-micro)] leading-none text-muted-foreground",
        },
    },

    /**
     * Eyebrow heading used inside a `FormSection` title slot. Applies the
     * compact uppercase treatment shared by form section labels.
     */
    FormSectionTitle: {
        root: {
            class: "m-0 text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em] leading-none text-muted-foreground",
        },
    },

    /**
     * Responsive 12-column grid for form fields. Direct children default to
     * full width and can opt into configured column spans at the form
     * breakpoint.
     */
    FormGrid: {
        root: {
            class: [
                "grid grid-cols-12 gap-x-5 gap-y-4 min-w-0",
                "[&>*]:col-span-12 [&>*]:min-w-0",
                "[@media(min-width:720px)]:[&>[data-col='3']]:col-span-3",
                "[@media(min-width:720px)]:[&>[data-col='4']]:col-span-4",
                "[@media(min-width:720px)]:[&>[data-col='6']]:col-span-6",
                "[@media(min-width:720px)]:[&>[data-col='8']]:col-span-8",
                "[@media(min-width:720px)]:[&>[data-col='9']]:col-span-9",
            ],
        },
    },

    /**
     * Action row for form submit, cancel, or secondary controls. Keeps actions
     * wrapping cleanly and exposes a spacer slot for right-aligned groups.
     */
    FormActions: {
        root: {
            class: "flex flex-wrap gap-2 pt-2 mt-1",
        },
        spacer: {
            class: "flex-1",
        },
    },

    /**
     * Compact feedback indicator for hidden or space-constrained fields.
     * Groups required, error, warning, and help affordances behind a popover.
     */
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

    // ---------- Confirmation ----------

    /**
     * Anti-mistake confirmation field used before destructive actions. Styles
     * the muted confirmation box, inline expected-value chip, and mono input.
     */
    TypedConfirmField: {
        root: {
            class: [
                "flex flex-col gap-1.5 px-3.5 py-3 rounded-vueda-card border border-border",
                "bg-[color-mix(in_oklab,var(--muted)_40%,var(--background))]",
            ],
        },
        label: {
            class: ["text-[12px] font-medium leading-tight text-foreground"],
        },
        expectedChip: {
            class: [
                "inline-flex items-center px-1.5 py-0.5 mx-0.5",
                "rounded-[3px] border border-border bg-background",
                "font-mono text-[12px] font-semibold leading-none text-foreground",
            ],
        },
        input: {
            class: [
                "h-8 px-2.5 w-full min-w-0",
                "rounded-vueda-control hairline bg-background",
                "font-mono text-[12.5px] font-medium leading-none text-foreground",
                "placeholder:text-muted-foreground placeholder:font-normal",
                "shadow-vueda-control transition-shadow",
                "focus-visible:hairline-ring focus-visible:focus-ring-shadow focus-visible:outline-none",
            ],
        },
    },
};
