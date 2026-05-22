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
        /** Card shell for a repeated-value fieldset. See also: {@api theme-key:FieldSetStackedInline.root}. */
        root: {
            class: [
                "bg-card border rounded-vueda-card overflow-clip",
                "[[data-vueda-fieldset]_&]:border-0 [[data-vueda-fieldset]_&]:shadow-[inset_0_0_0_1px_var(--border)]",
            ],
        },
        /** Padded vertical stack that holds the title bar, rows, chores panel, and footer. */
        inner: {
            class: ["flex flex-col p-3 gap-2"],
        },
        /** Compact uppercase fieldset label. */
        label: {
            class: [
                "leading-none",
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em] text-muted-foreground",
            ],
        },
        /** Header strip that separates the fieldset label from repeated rows and tints nested fieldsets. */
        header: {
            class: [
                "flex items-center justify-between gap-2 px-3 py-2 -mx-3 -mt-3 mb-1 border-b border-border",
                "[[data-vueda-fieldset]_&]:bg-[color-mix(in_oklab,var(--muted)_20%,var(--card))]",
            ],
        },
        /** One repeated value row with a full-width field track and a reveal-on-hover remove control. */
        row: {
            class: ["group/many-row grid grid-cols-[1fr_auto] items-center gap-1 2xs:gap-2"],
        },
        /** Field wrapper that lets the rendered control shrink without overflowing the row. */
        component: {
            class: ["min-w-0"],
        },
        /** Remove-button cell that stays available to focus and appears on row hover or focus. */
        removeButton: {
            class: [
                "flex items-center justify-center",
                "opacity-0 transition-opacity",
                "group-hover/many-row:opacity-100 group-focus-within/many-row:opacity-100",
            ],
        },
        /** Right-aligned footer for adding another repeated value. */
        footer: {
            class: ["flex justify-end mt-0.5"],
        },
        /** Pass-through hook for the Add action. Button styling comes from {@api theme-key:Button}. */
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
        /** Card shell for paired lower and upper range fields, including nested-fieldset inset chrome. */
        root: {
            class: [
                "bg-card border rounded-vueda-card overflow-clip p-3",
                "[[data-vueda-fieldset]_&]:border-0 [[data-vueda-fieldset]_&]:shadow-[inset_0_0_0_1px_var(--border)]",
            ],
        },
        /** Responsive range grid that stacks on narrow viewports and splits into lower, separator, upper at `sm`. */
        inner: {
            class: ["grid items-center gap-1 2xs:gap-2", "grid-cols-1 sm:grid-cols-[1fr_16px_1fr]"],
        },
        /** Label row above the paired controls. */
        header: {
            class: ["flex items-baseline gap-1 2xs:gap-2 mb-1"],
        },
        /** Visual separator between lower and upper bounds. */
        separator: {
            class: [
                "hidden sm:flex items-center justify-center text-muted-foreground",
                "h-8 w-4 select-none leading-none",
            ],
        },
        /** Compact uppercase range title. */
        title: {
            class: [
                "leading-none",
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em] text-muted-foreground",
            ],
        },
        /** Compact uppercase fallback label for the range group. See also: {@api theme-key:FieldSetRange.title}. */
        label: {
            class: [
                "leading-none",
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em] text-muted-foreground",
            ],
        },
        /** Wrapper around each rendered range endpoint field. */
        field: {
            class: [
                // "rounded", "px-1 lg:px-2 py-1 lg:py-2", "mb-2 lg:mb-4"
            ],
        },
        /** Fieldset-level description and messages panel below the paired controls. */
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
        /** Card shell for stacked inline rows, including nested-fieldset inset chrome. */
        root: {
            class: [
                "bg-card border rounded-vueda-card overflow-clip",
                "[[data-vueda-fieldset]_&]:border-0 [[data-vueda-fieldset]_&]:shadow-[inset_0_0_0_1px_var(--border)]",
            ],
        },
        /** Padded vertical stack that holds the title bar, row list, chores panel, and empty state. */
        inner: {
            class: ["flex flex-col p-3 gap-2"],
        },
        /** Legacy divider slot kept hidden because the title bar owns the fieldset separator. */
        hr: {
            class: "hidden",
        },
        /** Full-width eyebrow title bar that also acts as the disclosure trigger when the fieldset is hidable. */
        titleBar: {
            class: [
                "flex items-center gap-2 2xs:gap-3 px-3 py-2 -mx-3 -mt-3 mb-1 border-b border-border",
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em] leading-none text-muted-foreground",
                "[[data-vueda-fieldset]_&]:bg-[color-mix(in_oklab,var(--muted)_20%,var(--card))]",
            ],
        },
        /** Interactive state layer for hidable title bars. */
        titleBarToggle: {
            class: [
                "cursor-pointer select-none",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "transition-colors",
            ],
        },
        /** Chevron container that rotates when the fieldset collapses. */
        toggleIndicator: {
            class: ["inline-flex items-center justify-center shrink-0 size-4", "transition-transform duration-150"],
        },
        /** Title text slot inside the title bar. */
        title: {
            class: [],
        },
        /** Wrapper around each rendered child field inside a stacked row. */
        field: {
            class: [
                // "rounded", "px-1 lg:px-2 py-1 lg:py-2",
                "min-w-1",
            ],
        },
        /** Vertical list of inline object rows. */
        inlineRows: {
            class: ["flex flex-col gap-2"],
        },
        /** Pass-through hook for each rendered row component. Row chrome lives on {@api theme-key:FieldSetStackedInlineRow.root}. */
        inlineRow: {},
        /** Full-width inline create affordance used when a row-shaped invitation is rendered. */
        inLineCreateButton: {
            class: ["!w-full h-full"],
        },
        /** Pass-through hook for the hide/show button when consumers render it separately. */
        toggleButton: {
            class: [],
        },
        /** Trailing action group in the title bar. Stops toggle propagation in the component. */
        actionBar: {
            class: "grow-0 flex gap-1 2xs:gap-2 2xl:gap-4 ml-auto",
        },
        /** Row-level action group for create, destroy, or selection controls. */
        itemActionBar: {
            class: "flex gap-1 2xs:gap-2 2xl:gap-4 items-baseline",
        },
        /** Pass-through hook for the Create action. Button styling comes from {@api theme-key:Button}. */
        createButton: {
            class: [],
        },
        /** Fieldset-level help and validation panel below the row stack. */
        choresPanel: {
            class: [
                "-mx-3 -mb-3 px-3 py-2 border-t border-border",
                "bg-[color-mix(in_oklab,var(--muted)_15%,var(--card))]",
                "flex flex-col gap-1",
            ],
        },
        /** Dashed invitation block used when no inline rows exist. */
        emptyState: {
            class: [
                "flex flex-col items-center justify-center gap-2",
                "py-8 px-6 text-center",
                "rounded-vueda-card border-2 border-dashed border-border bg-muted/30",
            ],
        },
        /** Muted icon disc inside the empty-state invitation. */
        emptyStateIcon: {
            class: [
                "flex items-center justify-center",
                "size-9 rounded-full bg-muted text-muted-foreground",
                "text-[length:var(--vueda-text-title)] leading-none",
            ],
        },
        /** Short empty-state headline. */
        emptyStateTitle: {
            class: ["text-[length:var(--vueda-text-reading)] font-semibold leading-snug text-foreground"],
        },
        /** Supporting empty-state hint copy. */
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
        /** Bordered row card with dirty and selected-for-destroy state chrome. */
        root: {
            class: [
                "flex items-start gap-3 border rounded-vueda-card p-2.5",
                "data-[state=dirty]:border-l-2 data-[state=dirty]:border-l-primary",
                "data-[state=selected-for-destroy]:bg-destructive/5 data-[state=selected-for-destroy]:border-destructive/40",
            ],
        },
        /** Fixed leading hook before row fields, commonly used for drag handles or markers. */
        beforeFields: {
            class: ["w-6 shrink-0"],
        },
        /** Trailing hook after row fields and before actions. */
        afterFields: {
            class: ["shrink-0"],
        },
        /** Pass-through wrapper immediately inside a rendered row field. */
        fieldInner: {
            class: [],
        },
        /** Wrapper around each field rendered in the row. */
        field: {
            class: [
                // "rounded", "px-1 lg:px-2 py-1 lg:py-2", "mb-2 lg:mb-4"
            ],
        },
        /** Flexible field column that owns remaining row width. */
        fields: {
            class: ["flex-1 min-w-0"],
        },
        /** Outer action group for row controls, pinned to the row start edge. */
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
        /** Card shell for tabular inline editing, including nested-fieldset inset chrome. */
        root: {
            class: [
                "bg-card border rounded-vueda-card overflow-clip",
                "[[data-vueda-fieldset]_&]:border-0 [[data-vueda-fieldset]_&]:shadow-[inset_0_0_0_1px_var(--border)]",
            ],
        },
        /** Unpadded vertical stack so the embedded grid can merge with the card edge. */
        inner: {
            class: ["flex flex-col"],
        },
        /** Legacy divider slot kept hidden because the title bar owns the separator. */
        hr: {
            class: "hidden",
        },
        /** Eyebrow title bar for tabular inline fieldsets. See also: {@api theme-key:FieldSetStackedInline.titleBar}. */
        titleBar: {
            class: [
                "flex items-center gap-2 2xs:gap-3 px-3 py-2 border-b border-border",
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em] leading-none text-muted-foreground",
                "[[data-vueda-fieldset]_&]:bg-[color-mix(in_oklab,var(--muted)_20%,var(--card))]",
            ],
        },
        /** Interactive state layer for a hidable tabular title bar. See also: {@api theme-key:FieldSetStackedInline.titleBarToggle}. */
        titleBarToggle: {
            class: [
                "cursor-pointer select-none",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "transition-colors",
            ],
        },
        /** Chevron container that rotates when the tabular fieldset collapses. */
        toggleIndicator: {
            class: ["inline-flex items-center justify-center shrink-0 size-4", "transition-transform duration-150"],
        },
        /** Title text slot inside the tabular title bar. */
        title: {
            class: [],
        },
        /** Trailing action group in the title bar. */
        actionBar: {
            class: "grow-0 flex gap-1 2xs:gap-2 2xl:gap-4 ml-auto",
        },
        /** Row action group used by the embedded grid action column. */
        itemActionBar: {
            class: "flex gap-1 2xs:gap-2 2xl:gap-4 items-baseline",
        },
        /** Grid body wrapper that stamps `data-flush` so {@api theme-key:ObjectsGrid.root} drops duplicate chrome. */
        body: {
            class: ["flex flex-col"],
        },
        /** Embedded objects grid host. */
        objectsGrid: {
            class: "w-full",
        },
        /** Hidden grid state used when the empty invitation replaces the tabular body. */
        objectsGridHidden: {
            class: "hidden",
        },
        /** Compact destructive status pill shown on rows marked for destroy. */
        destroyPill: {
            class: [
                "inline-flex items-center justify-center shrink-0",
                "px-1.5 h-5 rounded-vueda-control",
                "bg-destructive/10 text-destructive",
                "text-[10px] font-semibold uppercase tracking-[0.06em] leading-none",
                "[font-variant-numeric:tabular-nums]",
            ],
        },
        /** Wrapper around each field rendered for card-mode tabular rows. */
        field: {
            class: [
                // "rounded", "px-1 lg:px-2 py-1 lg:py-2",
                "min-w-1",
            ],
        },
        /** Pass-through wrapper immediately inside a rendered tabular field. */
        fieldInner: {
            class: [],
        },
        /** Pass-through hook for the Create action. Button styling comes from {@api theme-key:Button}. */
        createButton: {
            class: [],
        },
        /** Full-width inline create affordance used by row-shaped invitations. */
        inLineCreateButton: {
            class: ["!w-full h-full"],
        },
        /** Pass-through hook for a separate hide/show button. The title bar is the canonical toggle surface. */
        toggleButton: {
            class: [],
        },
        /** Card-mode create invitation gets dashed chrome to read as an empty row affordance. */
        createButtonCard: {
            class: "border-dashed",
        },
        /** Fieldset-level help and validation panel below the embedded grid. */
        choresPanel: {
            class: [
                "px-3 py-2 border-t border-border",
                "bg-[color-mix(in_oklab,var(--muted)_15%,var(--card))]",
                "flex flex-col gap-1",
            ],
        },
        /** Dashed invitation block used when no tabular rows exist. See also: {@api theme-key:FieldSetStackedInline.emptyState}. */
        emptyState: {
            class: [
                "flex flex-col items-center justify-center gap-2",
                "m-3 py-8 px-6 text-center",
                "rounded-vueda-card border-2 border-dashed border-border bg-muted/30",
            ],
        },
        /** Muted icon disc inside the tabular empty-state invitation. */
        emptyStateIcon: {
            class: [
                "flex items-center justify-center",
                "size-9 rounded-full bg-muted text-muted-foreground",
                "text-[length:var(--vueda-text-title)] leading-none",
            ],
        },
        /** Short empty-state headline for tabular inline rows. */
        emptyStateTitle: {
            class: ["text-[length:var(--vueda-text-reading)] font-semibold leading-snug text-foreground"],
        },
        /** Supporting empty-state hint copy for tabular inline rows. */
        emptyStateDesc: {
            class: [
                "text-[length:var(--vueda-text-supporting)] font-normal leading-normal text-muted-foreground max-w-[44ch]",
            ],
        },
        /** Component-local override that gives embedded grid cells enough minimum width inside fieldsets. */
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
        /** Root wrapper for one filter control in a filter toolbar. */
        root: {},
        /** Clear action that becomes dashed when inactive and red when the filter errors. */
        clearButton: {
            class: ({ hasFilterValue, errored }) => ({
                "!border-dashed": !hasFilterValue,
                "!border-red-500 !text-red-500": errored,
            }),
        },
        /** Dropdown trigger mirrors clear-button state so inactive and errored filters read consistently. */
        dropdownButton: {
            class: ({ hasFilterValue, errored }) => ({
                "!border-dashed": !hasFilterValue,
                "!border-red-500 !text-red-500": errored,
            }),
        },
        /** Popover body width floor for the filter form. */
        formPopover: {
            class: ["sm:min-w-[25%]"],
        },
    },

    /**
     * Form body rendered inside a filter popover. Provides the heading and
     * vertical layout for the filter field and submit action.
     */
    FilterForm: {
        /** Vertical form body inside a filter popover. */
        outer: {
            class: ["flex flex-col"],
        },
        /** Filter form heading. */
        heading: {
            class: ["font-bold leading-relaxed"],
        },
    },

    /**
     * Filter toolbar for model list views. Arranges active filter controls,
     * message content, and the wrapper that hosts each `FilterComponent`.
     */
    FilterGroup: {
        /** Toolbar root. */
        root: {
            class: "flex-col ",
        },
        /** Wrapping row for active filter controls. */
        filtersWrapper: {
            class: "flex flex-wrap gap-1 mt-1",
        },
        /** Message area above or near the filter controls. */
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
        /** Outer spacing for form-scope feedback. */
        root: {
            class: ["my-2"],
        },
        /** Disc list used when a form-level message expands into multiple entries. */
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
        /** Root model-form wrapper. */
        root: {
            class: [],
        },
        /** Vertical stack for generated fields. */
        inner: {
            class: ["flex flex-col"],
        },
        /** Optional model-form label above the generated field stack. */
        label: {
            class: ["ml-2 leading-7", "text-neutral-900/60 dark:text-white/60"],
        },
        /** Hook before the generated fields. */
        beforeFields: {
            class: [],
        },
        /** Hook after the generated fields. */
        afterFields: {
            class: [],
        },
        /** Container for generated field entries. */
        fields: {
            class: [],
        },
        /** Wrapper around each generated field. */
        field: {
            class: [
                // "rounded", "px-1 lg:px-2 py-1 lg:py-2", "mb-2 lg:mb-4"
            ],
        },
        /** Pass-through wrapper immediately inside a generated field. */
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
        /** Section stack for a long-form group. */
        root: {
            class: "flex flex-col gap-3 [&+&]:mt-2",
        },
        /** Header row that pairs the title slot with optional aside metadata. */
        head: {
            class: "flex items-baseline justify-between gap-2 pb-1.5 border-b border-border",
        },
        /** Mono trailing metadata such as required or optional hints. */
        aside: {
            class: "font-mono text-[length:var(--vueda-text-micro)] leading-none text-muted-foreground",
        },
    },

    /**
     * Eyebrow heading used inside a `FormSection` title slot. Applies the
     * compact uppercase treatment shared by form section labels.
     */
    FormSectionTitle: {
        /** Eyebrow heading text for a form section. */
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
        /** Twelve-column field grid with `data-col` span hooks at the form breakpoint. */
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
        /** Wrapping action row for submit, cancel, and secondary controls. */
        root: {
            class: "flex flex-wrap gap-2 pt-2 mt-1",
        },
        /** Flexible spacer for splitting left and right action groups. */
        spacer: {
            class: "flex-1",
        },
    },

    /**
     * Compact feedback indicator for hidden or space-constrained fields.
     * Groups required, error, warning, and help affordances behind a popover.
     */
    FormHiddenFeedback: {
        /** Compact wrapper for hidden-field feedback controls. */
        root: {
            class: "min-w-min",
        },
        /** Vertical stack inside the hidden-feedback popover. */
        popoverBody: {
            class: "flex flex-col gap-1 md:gap-2 2xl:gap-4",
        },
        /** One feedback row inside the popover. */
        popoverItem: {
            class: [],
        },
        /** Trigger button for the hidden-feedback popover. */
        button: {
            class: [],
        },
        /** Feedback trigger or row icon. */
        icon: {
            class: [],
        },
        /** Required-field indicator inside the compact feedback group. */
        required: {
            class: [],
        },
        /** Error indicator inside the compact feedback group. */
        errors: {
            class: [],
        },
        /** Warning indicator inside the compact feedback group. */
        warnings: {
            class: [],
        },
        /** Help indicator inside the compact feedback group. */
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
        /** Muted confirmation box that groups the label and input before a destructive action. */
        root: {
            class: [
                "flex flex-col gap-1.5 px-3.5 py-3 rounded-vueda-card border border-border",
                "bg-[color-mix(in_oklab,var(--muted)_40%,var(--background))]",
            ],
        },
        /** Instruction label for the expected typed confirmation value. */
        label: {
            class: ["text-[12px] font-medium leading-tight text-foreground"],
        },
        /** Inline mono chip that echoes the exact expected value. */
        expectedChip: {
            class: [
                "inline-flex items-center px-1.5 py-0.5 mx-0.5",
                "rounded-[3px] border border-border bg-background",
                "font-mono text-[12px] font-semibold leading-none text-foreground",
            ],
        },
        /** Mono input for the typed confirmation value, using the shared input focus-ring contract. */
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
