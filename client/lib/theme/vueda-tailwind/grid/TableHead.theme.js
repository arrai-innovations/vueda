/**
 * @module theme/vueda-tailwind/grid/TableHead.theme
 *
 * Per-component theme registration for TableHead. Imported as a side effect by
 * TableHead.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire grid family.
 *
 * Prototype-phase duplication: this entry mirrors the TableHead slice of
 * grid/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Header cell primitive for table columns. Carries the density, sticky
     * header, numeric alignment, and checkbox offset rules used by `Table`.
     */
    TableHead: {
        /**
         * The header cell slot for `<th>` elements. It owns compact header typography, density heights, sticky positioning, checkbox offsets, and numeric sort-icon ordering; see {@api theme-key:Table.table}.
         */
        root: {
            class: [
                "text-foreground h-10 px-2 text-left align-middle font-semibold text-[length:var(--vueda-text-supporting)] whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
                "[[data-density=compact]_&]:h-8",
                "[[data-density=condensed]_&]:h-7 [[data-density=condensed]_&]:text-[11px]",
                "data-[numeric]:text-right data-[numeric]:[&_[data-slot=sort-icon]]:order-first",
                "[[data-sticky]_&]:sticky [[data-sticky]_&]:top-0 [[data-sticky]_&]:z-2 [[data-sticky]_&]:bg-card [[data-sticky]_&]:[box-shadow:0_1px_0_0_var(--border)]",
            ],
        },
    },
});
