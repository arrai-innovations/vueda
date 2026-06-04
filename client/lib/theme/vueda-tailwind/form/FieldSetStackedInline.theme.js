/**
 * @module theme/vueda-tailwind/form/FieldSetStackedInline.theme
 *
 * Per-component theme registration for FieldSetStackedInline. Imported as a side effect by
 * FieldSetStackedInline.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 *
 * Prototype-phase duplication: this entry mirrors the FieldSetStackedInline slice of
 * form/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
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
});
