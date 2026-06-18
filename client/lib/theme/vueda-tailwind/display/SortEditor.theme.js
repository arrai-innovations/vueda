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
        /** Vertical list wrapper for reorderable sort fields. */
        draggable: {
            class: ["flex flex-col gap-2"],
        },
        /** Bordered sort-field row containing the handle, order text, and select. */
        draggableItem: {
            class: ["flex flex-row rounded-lg border p-3"],
        },
        /** Flexible row content inside each draggable item. */
        draggableItemInner: {
            class: ["select-none flex flex-row gap-3 items-center justify-between grow flex-1"],
        },
        /** Pointer target for dragging a sort field. */
        dragHandle: {
            class: ["drag-handle cursor-grab active:cursor-grabbing p-1"],
        },
        /** Small fixed-width sort-order label for the current field position. */
        sortOrderText: {
            class: ["w-3 text-sm font-semibold text-muted-foreground"],
        },
        /** Select control used to choose the sorted field. No width override: the SelectTrigger's own `w-fit` applies, and the hosting `PopoverContent` (width auto) expands to fit the label. `w-full` is avoided because it causes circular sizing in a shrink-to-fit container. */
        select: {
            class: [],
        },
        /** Inline action alignment for per-sort-field controls. */
        sortInlineActionBar: {
            class: ["flex flex-row content-baseline justify-end"],
        },
        /** Action stack for add, clear, or cancel commands. */
        actionBar: {
            class: ["flex flex-col gap-2"],
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
