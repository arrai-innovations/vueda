/**
 * @module theme/vueda-tailwind/form/FieldSetMany.theme
 *
 * Per-component theme registration for FieldSetMany. Imported as a side effect by
 * FieldSetMany.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 *
 * Prototype-phase duplication: this entry mirrors the FieldSetMany slice of
 * form/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
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
});
