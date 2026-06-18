/**
 * @module theme/vueda-tailwind/display/SortEditor.theme
 *
 * Per-component theme registration for SortEditor. Imported as a side effect by
 * SortEditor.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SortEditor is the shell-agnostic multi-field sort editor body: drag handles, order text, per-row field selects, and the add/clear action bar. A shell (drawer or popover) hosts it.
     */
    SortEditor: {
        /** Outer stack for the reorderable field list and the action bar. */
        root: {
            class: ["flex flex-col gap-4"],
        },
        /** Shared five-column grid for reorderable sort fields. The field column absorbs any width left by a wider host, while intrinsic sizing follows the longest field label. */
        draggable: {
            class: [
                "grid grid-cols-[max-content_max-content_minmax(max-content,1fr)_max-content_max-content] gap-x-3 gap-y-2",
            ],
        },
        /** Bordered sort-field row that keeps its row surface while sharing the list's column tracks. */
        draggableItem: {
            class: ["col-span-full grid grid-cols-subgrid items-center rounded-lg border p-3"],
        },
        /** Layout-transparent grouping for the handle, order text, and field select. */
        draggableItemInner: {
            class: ["contents select-none"],
        },
        /** Pointer target for dragging a sort field. */
        dragHandle: {
            class: ["drag-handle cursor-grab active:cursor-grabbing p-1"],
        },
        /** Right-aligned sort-order label for the current field position. */
        sortOrderText: {
            class: ["justify-self-end text-right text-sm font-semibold tabular-nums text-muted-foreground"],
        },
        /** Field select stretched across the shared field column so every row uses the same width and left edge. */
        select: {
            class: ["!w-full justify-self-stretch"],
        },
        /** Layout-transparent grouping for the direction and remove actions. */
        sortInlineActionBar: {
            class: ["contents"],
        },
        /** Responsive action layout. Buttons stack on narrow screens and share a row when space permits. */
        actionBar: {
            class: ["grid grid-cols-1 gap-2 sm:grid-cols-2"],
        },
        /** Eyebrow at the top of the add-sort field-picker menu. The in-popover micro-eyebrow recipe (11 px / 600 / 0.04em). */
        addMenuEyebrow: {
            class: [
                "px-2 py-1.5 text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.04em] text-muted-foreground",
            ],
        },
        /** A selectable unused-field row in the add-sort menu. */
        addMenuItem: {
            class: [
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
            ],
        },
        /** Empty-state message shown when every sortable field is already in the sort. */
        addMenuEmpty: {
            class: ["px-2 py-1.5 text-sm text-muted-foreground"],
        },
    },
});
