/**
 * @module theme/vueda-tailwind/navigation/PaginationComponent.theme
 *
 * Per-component theme registration for PaginationComponent. Imported as a side effect by
 * PaginationComponent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * PaginationComponent styles the composed pagination widget used by higher-level data views.
     */
    PaginationComponent: {
        /** Class forwarded to the embedded {@api theme-key:NavigationPaginationBar} root. Empty by default: the bar supplies the footer chrome (border, surface, radius caps) and the inner {@api theme-key:PaginationComponent.layout} owns the responsive arrangement. */
        root: {
            class: [],
        },
        /** Footer arrangement inside the bar. Read-out group and navigation cluster sit on one row split to the edges from `sm` up (`justify-between`); below `sm` they wrap and center so the read-out and selector form a centered row above the navigation row. */
        layout: {
            class: ["flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-between"],
        },
        /** Read-out group: the {@api theme-key:PaginationMeta} range string and the rows-per-page selector, grouped together (the mockup's left cluster). Wraps and centers on narrow viewports. */
        summary: {
            class: ["flex flex-wrap items-center justify-center gap-x-4 gap-y-1"],
        },
        /** Rows-per-page label wrapping the `NativeSelect`. Supporting-size muted label so the selector reads as secondary chrome beside the read-out. */
        rowsPerPage: {
            class: ["flex items-center gap-1.5 text-[length:var(--vueda-text-supporting)] text-muted-foreground"],
        },
        /** Class forwarded to the embedded {@api theme-key:Pagination} navigation cluster (first / previous / page-report / next / last). `shrink-0` keeps the cluster intact; the component strips the primitive's `w-full` via a theme override so it sizes to its content rather than claiming a full row. */
        paginator: {
            class: ["shrink-0"],
        },
        /** Mono "Page N of M" indicator between the previous and next controls; tabular for stable numeric width. */
        pageReport: {
            class: ["px-2 font-mono text-[length:var(--vueda-text-supporting)] tabular-nums text-foreground"],
        },
    },
});
