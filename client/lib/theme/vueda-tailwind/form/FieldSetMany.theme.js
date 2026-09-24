/**
 * @module theme/vueda-tailwind/form/FieldSetMany.theme
 *
 * Per-component theme registration for FieldSetMany. Imported as a side effect by
 * FieldSetMany.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
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
                // Surface and nested fieldset treatment.
                "bg-card border-hairline rounded-vueda-card overflow-clip",
                "[[data-vueda-fieldset]_&]:border-0 [[data-vueda-fieldset]_&]:shadow-[inset_0_0_0_var(--vueda-hairline-width)_var(--border)]",
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
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em]",
                "text-muted-foreground",
            ],
        },
        /** Header strip that separates the fieldset label from repeated rows and tints nested fieldsets. */
        header: {
            class: [
                // Layout and edge merge.
                "flex items-center justify-between gap-2 px-3 py-2 -mx-3 -mt-3 mb-1 border-b-hairline",

                // Nested fieldset surface.
                "[[data-vueda-fieldset]_&]:bg-[color-mix(in_oklab,var(--muted)_20%,var(--card))]",
            ],
        },
        /** Vertical spacing between repeated entries, including their validation messages. */
        rows: {
            class: ["flex flex-col gap-2"],
        },
        /** One repeated value row with a full-width field track and a reveal-on-hover remove control. */
        row: {
            class: ["group/many-row grid grid-cols-[minmax(0,1fr)_auto] items-start gap-1 2xs:gap-2"],
        },
        /** Field wrapper that lets the control shrink. Repeated labels stay accessible but visually hidden under the fieldset heading; descriptions and validation messages remain in the field layout. */
        component: {
            class: ["min-w-0 [&>[data-slot=field]>[data-slot=field-label]]:sr-only"],
        },
        /** Remove-button cell aligned with the first control-height of the row, independent of messages below it. Stays available to focus and appears on row hover or focus. */
        removeButton: {
            class: [
                "flex h-vueda-control items-center justify-center",
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
