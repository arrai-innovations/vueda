/**
 * @module theme/vueda-tailwind/display/SortChip.theme
 *
 * Per-component theme registration for SortChip. Imported as a side effect by
 * SortChip.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SortChip renders one active sort field as a removable pill. The label
     * segment toggles direction; the trailing segment removes the field. Neutral
     * tint (not the primary tint of FilterChip): ordering is not a predicate, so
     * it does not earn the accent, and the neutral surface keeps sort chips
     * distinct from filter chips when both share a strip.
     */
    SortChip: {
        /** Pill container. Neutral surface with a strong hairline so it reads against both the card and the constraints-strip tint. */
        root: {
            class: [
                "inline-flex items-center rounded-full hairline hairline-border-strong bg-card text-xs font-semibold text-foreground",
                // Drag states (sortablejs in force-fallback mode). The floating clone
                // (`.sortable-drag`) reads as a lifted, primary-accented chip; the gap it
                // leaves behind (`.sortable-ghost`) is dimmed to mark the drop target.
                "[&.sortable-ghost]:opacity-40",
                "[&.sortable-drag]:cursor-grabbing [&.sortable-drag]:hairline-primary [&.sortable-drag]:bg-primary/10 [&.sortable-drag]:text-primary",
            ],
        },
        /** Label segment: field label and direction glyph. Clicking it flips direction. Stretches to full pill height so the hover target covers the pill. Carries the left pill radius when no leading ordinal is shown, and the right pill radius when no remove control is shown. */
        label: {
            class: ({ showOrdinal, removable }) => [
                "inline-flex items-center self-stretch gap-1.5 py-1 pr-2 hover:bg-accent",
                showOrdinal ? "pl-1.5" : "rounded-l-full pl-2.5",
                !removable && "rounded-r-full",
            ],
        },
        /** Drag handle (`.drag-handle`, grab cursor): a grip glyph plus the priority ordinal. Leftmost segment carrying the left pill radius. Shown only with more than one sort, so it is also the reorder affordance for touch (no hover needed to discover it). */
        handle: {
            class: [
                "drag-handle inline-flex items-center self-stretch gap-0.5 rounded-l-full cursor-grab select-none py-1 pl-2 pr-1",
                "text-[length:var(--vueda-text-micro)] text-muted-foreground hover:bg-accent",
            ],
        },
        /** Grip glyph inside the handle. The visible drag affordance; sized down to read as chrome beside the ordinal. */
        grip: {
            class: ["leading-none opacity-70"],
        },
        /** Priority ordinal. Mono and muted: it is positional read-out, and ordering priority is the one thing a sort chip carries that a filter chip does not. */
        ordinal: {
            class: ["font-mono text-[length:var(--vueda-text-micro)] font-medium tabular-nums text-muted-foreground"],
        },
        /** Field label segment. */
        field: {
            class: ["font-semibold"],
        },
        /** Direction glyph. Rendered descending by default; the SFC rotates it 180deg for ascending. */
        direction: {
            class: ["text-muted-foreground"],
        },
        /** Hairline divider between the label and the remove control. */
        divider: {
            class: ["h-4 w-hairline bg-border"],
        },
        /** Remove segment (the trailing dismiss control). Carries the right pill radius; stretches to full pill height to match the label hover target. */
        remove: {
            class: [
                "inline-flex items-center self-stretch rounded-r-full px-1.5 py-1 opacity-70 hover:bg-accent hover:opacity-100",
            ],
        },
    },
});
