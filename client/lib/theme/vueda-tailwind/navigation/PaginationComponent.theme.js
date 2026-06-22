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
        /** Class forwarded to the embedded {@api theme-key:NavigationPaginationBar} root. Empty by default: the bar supplies the footer chrome (border, surface, radius caps, and the `justify-between` row) so the read-out sits at the start and the controls cluster at the end. Wraps to two rows on the narrowest viewports via the bar's own layout. */
        root: {
            class: ["flex-wrap"],
        },
        /** Right-hand controls cluster: the rows-per-page selector and the navigation paginator, grouped at the end of the bar opposite the {@api theme-key:PaginationMeta} read-out. */
        controls: {
            class: ["flex flex-wrap items-center gap-3"],
        },
        /** Rows-per-page label wrapping the `NativeSelect`. Supporting-size muted label so the selector reads as secondary chrome next to the paginator. */
        rowsPerPage: {
            class: ["flex items-center gap-1.5 text-[length:var(--vueda-text-supporting)] text-muted-foreground"],
        },
        /** Navigation paginator region (first / previous / page-report / next / last). */
        paginator: {
            class: ["flex items-center"],
        },
        /** Mono "Page N of M" indicator between the previous and next controls; tabular for stable numeric width. */
        pageReport: {
            class: ["px-2 font-mono text-[length:var(--vueda-text-supporting)] tabular-nums text-foreground"],
        },
    },
});
