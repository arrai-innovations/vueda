/**
 * @module theme/vueda-tailwind/views/ViewList.theme
 *
 * Per-component theme registration for ViewList. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ViewList arranges the model list page controls around search, filters,
     * bulk actions, grid content, totals, and pagination.
     */
    ViewList: {
        /** Class forwarded to the `selected_` checkbox column on the embedded {@api theme-key:ObjectsGrid}. Collapses the column to `w-0` at the `lg+` table breakpoint so card layouts keep room for the selection toggle while the table layout absorbs it into the row chrome. The breakpoint is hard-coded rather than derived from the `tableBreakpoint` prop because Tailwind purges classes it cannot see at build time; keep this aligned with the prop default. */
        selectedCheckbox: {
            class: ["lg:w-0"],
        },
        /** Class forwarded to the {@api theme-key:InputGroupInput} inside the search slot. Caps the input at 30ch on `lg+` so the search field does not consume the entire control bar on wide viewports. */
        searchInput: {
            class: ["lg:max-w-[30ch]"],
        },
        /** Per-button class applied to bulk-action `LinkModelView` entries inside the bulk-actions strip. `grow` on narrow viewports lets each button claim its share of the row width; `sm:grow-0` reverts to natural width once the row can hold the buttons inline. */
        bulkActionButton: {
            class: ["grow sm:grow-0"],
        },
        /** Per-button class applied to targetless-action entries rendered in the {@api theme-key:PageTitle.buttons} cluster. Empty by default; the buttons inherit the {@api theme-key:PageTitle} cluster layout and only need an override when a consumer wants action-specific chrome. */
        targetlessActionButton: {
            class: [],
        },
        /** Left cluster of the under-actions bar: the add-filter trigger (teleported in from {@api theme-key:FilterGroup}) and the mobile sort affordance, opposite the right-aligned {@api theme-key:ViewList.listControlBar}. */
        filterControls: {
            class: ["flex items-center gap-2"],
        },
        /** Teleport landing zone for the FilterGroup add-filter trigger. `contents` so the teleported trigger participates directly in the {@api theme-key:ViewList.filterControls} flex row rather than nesting in an extra box. */
        filterTriggerZone: {
            class: ["contents"],
        },
        /** Class forwarded to the embedded {@api theme-key:ObjectsGrid.root}. Suppresses the grid's own card border and radius so the ViewList strips above and below own the visible chrome; the grid renders as a flush slab between the filter strip and the pagination strip. */
        objectsGrid: {
            class: ["w-full border-0 rounded-none"],
        },
        /** Strip beneath the title row that holds the search input and the column-hiding select. Card-toned with a bottom hairline; shares the page-chrome rhythm with the title row above and the {@api theme-key:ViewList.paginationWrapper} below, so the chrome reads as a matched frame around the grid. */
        underActionsBar: {
            class: ["w-full flex items-center flex-wrap gap-3 px-5 py-3", "border-b bg-card text-foreground"],
        },
        /** Bulk-actions strip that surfaces once one or more rows are selected. 6 %-mix primary fill and 12 px / 500 type so it reads as an active selection band, not a passive section. Sits in the sticky-stack bottom zone just above the {@api theme-key:ViewList.paginationWrapper}; the top hairline separates it from the grid above, mirroring the pagination strip's rhythm so the chrome below the grid reads as a matched pair. */
        bulkActionsBar: {
            class: [
                "w-full flex items-center flex-wrap gap-[10px] px-5 py-[10px]",
                "border-t bg-primary/[0.06] text-foreground text-[12px] font-medium",
            ],
        },
        /** Button cluster inside the bulk-actions strip. Wraps so a large action menu folds across rows rather than overflowing the strip; `sm:w-fit sm:max-w-max` snaps the cluster to its content width once the viewport can hold all buttons inline. */
        actionButtonGroupBar: {
            class: ["flex flex-wrap gap-1 2xl:gap-2 w-full sm:w-fit sm:max-w-max"],
        },
        /** Right-aligned control cluster inside {@api theme-key:ViewList.underActionsBar} (search input + columns select). `ml-auto` pushes the cluster to the end of the strip so the title row above and this row align on the right. */
        listControlBar: {
            class: ["flex flex-row gap-1 2xl:gap-2 ml-auto"],
        },
        /** Cell class for the column-totals row appended below the body rows when any column declares a total. The 2 px top border separates the totals row from the data rows above it; the cell otherwise inherits {@api theme-key:ObjectsGridBodyCell} chrome. */
        columnTotalCell: {
            class: "border-t-2",
        },
        /** Pagination strip beneath the grid. Card-toned with a top hairline; mirrors the {@api theme-key:ViewList.underActionsBar} rhythm so the chrome above and below the grid read as a matched pair. */
        paginationWrapper: {
            class: ["w-full flex items-center flex-wrap gap-3 px-5 py-[10px]", "border-t bg-card text-foreground"],
        },
    },
});
