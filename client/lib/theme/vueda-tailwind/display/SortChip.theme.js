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
                "inline-flex items-center rounded-full border border-border-strong bg-card text-xs font-semibold text-foreground",
            ],
        },
        /** Label segment: priority ordinal, field label, and direction glyph. Clicking it flips direction. Stretches to full pill height so the hover target covers the pill. */
        label: {
            class: ["inline-flex items-center self-stretch gap-1.5 rounded-l-full py-0.5 pl-2.5 pr-2 hover:bg-accent"],
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
            class: ["h-3.5 w-px bg-border"],
        },
        /** Remove segment (the trailing dismiss control). Carries the right pill radius; stretches to full pill height to match the label hover target. */
        remove: {
            class: [
                "inline-flex items-center self-stretch rounded-r-full px-1.5 py-0.5 opacity-70 hover:bg-accent hover:opacity-100",
            ],
        },
    },
});
