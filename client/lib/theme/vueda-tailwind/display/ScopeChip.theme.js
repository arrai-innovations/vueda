/**
 * @module theme/vueda-tailwind/display/ScopeChip.theme
 *
 * Per-component theme registration for ScopeChip. Imported as a side effect by
 * ScopeChip.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ScopeChip renders one list scope as a read-only pill, with a clear control when the scope is clearable.
     * Info tint (not the primary tint of FilterChip): a scope arrives from a link
     * or application code rather than from the filter menu, and the distinct tint
     * keeps scope chips apart from filter chips when both share a strip.
     */
    ScopeChip: {
        /** Pill container. Info tint with a matching hairline. */
        root: {
            class: [
                "inline-flex max-w-full items-center rounded-full hairline text-xs font-semibold",
                "[--vueda-hairline-color:color-mix(in_oklab,var(--info)_30%,transparent)]",
                "bg-[color-mix(in_oklab,var(--info)_10%,transparent)] text-foreground",
            ],
        },
        /** Label segment. Read-only; truncates a long value (such as a UUID) with an ellipsis. Carries the left pill radius, and the right one when the chip has no clear control. */
        label: {
            class: ({ clearable }) => [
                "min-w-0 truncate rounded-l-full py-1 pl-2.5",
                clearable ? "pr-2" : "rounded-r-full pr-2.5",
            ],
        },
        /** Hairline divider between the label and the clear control. */
        divider: {
            class: ["h-4 w-hairline shrink-0 bg-[color-mix(in_oklab,var(--info)_30%,transparent)]"],
        },
        /** Clear segment (the trailing dismiss control). Carries the right pill radius. Stretches to the chip's full height so the hover target covers the pill. */
        remove: {
            class: [
                "inline-flex shrink-0 items-center self-stretch rounded-r-full px-1.5 py-1 opacity-70 hover:opacity-100",
                "hover:bg-[color-mix(in_oklab,var(--info)_15%,transparent)]",
            ],
        },
    },
});
