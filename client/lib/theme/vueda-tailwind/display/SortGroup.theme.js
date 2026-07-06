/**
 * @module theme/vueda-tailwind/display/SortGroup.theme
 *
 * Per-component theme registration for SortGroup. Imported as a side effect by
 * SortGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SortGroup renders the active sort order as a chips strip plus a Clear sort
     * control. Only rendered when a sort is active.
     */
    SortGroup: {
        /** Active-sort chips strip. A sunken tint a tier below the card so it reads as a distinct band from the primary-tinted filter strip above it. Shares the page-chrome rhythm and carries a bottom hairline. */
        strip: {
            class: [
                "w-full flex flex-wrap items-center gap-2 px-5 py-[10px]",
                "border-b-hairline bg-[color-mix(in_oklab,var(--sunken)_50%,var(--card))] text-foreground",
            ],
        },
        /** Bare chips group used when hosted inside a shared ConstraintsBar: the band chrome (border, tint, padding) belongs to the host, so this carries only the flex layout for the eyebrow and chips. */
        subgroup: {
            class: ["flex flex-wrap items-center gap-2"],
        },
        /** Drag-reorder container holding the sort chips; lays them out in the same flowing row as the strip so the wrapper adds no visual seam. */
        draggable: {
            class: ["flex flex-wrap items-center gap-2"],
        },
        /** Applied to the chips row only while a drag is in progress. Forces the grab-in-progress cursor on every handle and suppresses the per-handle hover background, so the chip that slides under the pointer (taking the dragged chip's old slot) does not read as the active handle. */
        dragging: {
            class: ["[&_.drag-handle]:cursor-grabbing", "[&_.drag-handle:hover]:bg-transparent"],
        },
        /** "Sort" eyebrow at the left of the chips strip. 11 px / 600 / 0.06em uppercase against `--muted-foreground`. */
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
    },
});
