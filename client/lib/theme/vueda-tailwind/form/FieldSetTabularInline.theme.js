/**
 * @module theme/vueda-tailwind/form/FieldSetTabularInline.theme
 *
 * Per-component theme registration for FieldSetTabularInline. Imported as a side effect by
 * FieldSetTabularInline.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Tabular inline editor for related objects. Connects field-set chrome to
     * an `ObjectsGrid` body with create, toggle, destroy, and empty-state
     * controls.
     */
    FieldSetTabularInline: {
        /** Card shell for tabular inline editing, including nested-fieldset inset chrome. */
        root: {
            class: [
                // Surface and nested fieldset treatment.
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
                "flex items-center gap-2 2xs:gap-3 px-3 py-2 border-b",
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em] leading-none",
                "text-muted-foreground",
                "[[data-vueda-fieldset]_&]:bg-[color-mix(in_oklab,var(--muted)_20%,var(--card))]",
            ],
        },
        /** Interactive state layer for a hidable tabular title bar. See also: {@api theme-key:FieldSetStackedInline.titleBarToggle}. */
        titleBarToggle: {
            class: [
                "cursor-pointer select-none",
                "hover:bg-accent hover:text-accent-foreground active:bg-accent-active active:text-accent-foreground",
                "focus-visible:focus-ring-shadow",
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
            class: ["grow-0 flex gap-1 2xs:gap-2 2xl:gap-4", "ml-auto"],
        },
        /** Row action group used by the embedded grid action column. */
        itemActionBar: {
            class: ["flex gap-1 2xs:gap-2 2xl:gap-4", "items-baseline"],
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
                "px-3 py-2 border-t",
                "bg-[color-mix(in_oklab,var(--muted)_15%,var(--card))]",
                "flex flex-col gap-1",
            ],
        },
        /** Dashed invitation block used when no tabular rows exist. See also: {@api theme-key:FieldSetStackedInline.emptyState}. */
        emptyState: {
            class: [
                "flex flex-col items-center justify-center gap-2",
                "m-3 py-8 px-6 text-center",
                "rounded-vueda-card border-2 border-dashed bg-muted/30",
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
                "text-[length:var(--vueda-text-supporting)] font-normal leading-normal",
                "text-muted-foreground max-w-[44ch]",
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
});
