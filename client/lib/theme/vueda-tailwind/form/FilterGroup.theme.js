/**
 * @module theme/vueda-tailwind/form/FilterGroup.theme
 *
 * Per-component theme registration for FilterGroup. Imported as a side effect by
 * FilterGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Filter orchestrator for model list views. Renders the toolbar add-filter
     * menu (whose trigger teleports into the under-actions bar) and, when filters
     * are active, the chips strip plus a Clear filters control. Owns the
     * active-filter list and keeps it in sync with the URL query.
     */
    FilterGroup: {
        /** Root wrapper. `contents` so it adds no box of its own: the teleported menu trigger and the chips strip flow as direct children of the list layout. */
        root: {
            class: ["contents"],
        },
        /** Active-filter chips strip. Muted tint a tier below the card-toned toolbar; only rendered when filters are active. Shares the `px-5 py-[10px]` page-chrome rhythm and carries a bottom hairline. */
        strip: {
            class: [
                "w-full flex flex-wrap items-center gap-2 px-5 py-[10px]",
                "border-b-hairline bg-[color-mix(in_oklab,var(--muted)_25%,var(--card))] text-foreground",
            ],
        },
        /** Bare chips group used when hosted inside a shared ConstraintsBar: the band chrome (border, tint, padding) belongs to the host, so this carries only the flex layout for the eyebrow and chips. */
        subgroup: {
            class: ["flex flex-wrap items-center gap-2"],
        },
        /** "Filters" eyebrow at the left of the chips strip. 11 px / 600 / 0.06em uppercase against `--muted-foreground`. */
        eyebrow: {
            class: [
                "text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.06em]",
                "text-muted-foreground leading-none",
            ],
        },
        /** Clear-all control, pushed to the right edge of the chips strip. */
        clear: {
            class: ["ml-auto text-xs"],
        },
        /** Error message area, rendered only when a list filter error is present (so it reserves no margin when empty). */
        messageWrapper: {
            class: ["w-full flex my-2"],
        },
    },
});
