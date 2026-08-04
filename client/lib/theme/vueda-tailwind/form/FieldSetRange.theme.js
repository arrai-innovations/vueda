/**
 * @module theme/vueda-tailwind/form/FieldSetRange.theme
 *
 * Per-component theme registration for FieldSetRange. Imported as a side effect by
 * FieldSetRange.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Paired-boundary field set for lower and upper range values. Groups the
     * two rendered fields, separator, and chores panel used by range filters
     * and form fields.
     */
    FieldSetRange: {
        /** Card shell for paired lower and upper range fields, including nested-fieldset inset chrome. */
        root: {
            class: [
                // Surface and nested fieldset treatment.
                "bg-card border-hairline rounded-vueda-card overflow-clip p-3",
                "[[data-vueda-fieldset]_&]:border-0 [[data-vueda-fieldset]_&]:shadow-[inset_0_0_0_var(--vueda-hairline-width)_var(--border)]",
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
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em]",
                "text-muted-foreground",
            ],
        },
        /** Compact uppercase fallback label for the range group. See also: {@api theme-key:FieldSetRange.title}. */
        label: {
            class: [
                "leading-none",
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em]",
                "text-muted-foreground",
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
                "-mx-3 -mb-3 mt-3 px-3 py-2 border-t-hairline",
                "bg-[color-mix(in_oklab,var(--muted)_15%,var(--card))]",
                "flex flex-col gap-1",
            ],
        },
    },
});
