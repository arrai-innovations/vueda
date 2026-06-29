/**
 * @module theme/vueda-tailwind/form/FilterChip.theme
 *
 * Per-component theme registration for FilterChip. Imported as a side effect by
 * FilterChip.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * FilterChip renders one active filter as a removable pill. The label segment
     * opens the field's edit form; the trailing segment removes the filter. The
     * pill is primary-tinted by default and destructive-tinted when the server
     * rejected the value.
     */
    FilterChip: {
        /** Pill container. Primary tint at rest; destructive tint flags a value the server rejected. */
        root: {
            class: ({ errored }) => [
                "inline-flex items-center rounded-full border text-xs font-semibold",
                errored
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-primary/30 bg-primary/10 text-primary",
            ],
        },
        /** Label segment: clicking it opens the edit popover. Carries the left pill radius. Stretches to the chip's full height so the hover target covers the full pill height. */
        label: {
            class: ({ errored }) => [
                "inline-flex items-center self-stretch gap-1.5 rounded-l-full py-1 pl-2.5 pr-2",
                errored ? "hover:bg-destructive/15" : "hover:bg-primary/15",
            ],
        },
        /** Hairline divider between the label and the remove control. */
        divider: {
            class: ({ errored }) => ["h-4 w-px", errored ? "bg-destructive/30" : "bg-primary/30"],
        },
        /** Remove segment (the trailing dismiss control). Carries the right pill radius. Stretches to the chip's full height so the hover target matches the label segment. */
        remove: {
            class: ({ errored }) => [
                "inline-flex items-center self-stretch rounded-r-full px-1.5 py-1 opacity-70 hover:opacity-100",
                errored ? "hover:bg-destructive/15" : "hover:bg-primary/15",
            ],
        },
        /** Edit-popover surface width floor for the embedded filter form. */
        popover: {
            class: ["sm:min-w-[25%]"],
        },
    },
});
