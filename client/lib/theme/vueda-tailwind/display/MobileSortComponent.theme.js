/**
 * @module theme/vueda-tailwind/display/MobileSortComponent.theme
 *
 * Per-component theme registration for MobileSortComponent. Imported as a side effect by
 * MobileSortComponent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * MobileSortComponent lays out mobile sorting controls inside a drawer workflow. It covers drag handles, order text, select controls, and action bars for reorderable sort fields.
     */
    MobileSortComponent: {
        /** Drawer height override for the mobile sorting workflow. */
        drawer: {
            class: ["!h-auto"],
        },
        /** Inner drawer stack for draggable fields and actions. */
        drawerInner: {
            class: ["flex flex-col gap-4"],
        },
        /** Vertical list wrapper for reorderable sort fields. */
        draggable: {
            class: ["flex flex-col gap-2"],
        },
        /** Bordered sort-field row containing the handle, order text, and select. */
        draggableItem: {
            class: ["flex flex-row rounded-lg border border-border p-3"],
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
        /** Full-width select control used to choose the sorted field. */
        select: {
            class: ["w-full"],
        },
        /** Inline action alignment for per-sort-field controls. */
        sortInlineActionBar: {
            class: ["flex flex-row content-baseline justify-end"],
        },
        /** Mobile drawer action stack for apply, clear, or cancel commands. */
        actionBar: {
            class: ["flex flex-col gap-2"],
        },
    },
});
