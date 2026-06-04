/**
 * @module theme/vueda-tailwind/objects-grid/ObjectsGridTableHeader.theme
 *
 * Per-component theme registration for ObjectsGridTableHeader. Imported as a
 * side effect by ObjectsGridTableHeader.vue, so a route chunk that pulls only
 * that SFC drags only this component's theme entry, not the entire objects-grid
 * family.
 *
 * Prototype-phase duplication: this entry mirrors the ObjectsGridTableHeader
 * slice of objects-grid/index.js, which remains the docs-tooling source of
 * truth until the extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Column header content for the table layout inside `ObjectsGrid`. Shows
     * the field label, sortable hover affordance, sort icon slot, and
     * multi-sort priority chip.
     */
    ObjectsGridTableHeader: {
        /** The interactive header content wrapper. It lays out the label, sort icon, and numeric-column reversal used when the parent header cell carries `data-numeric`. */
        root: {
            class: ({ props: { sortable } }) => [
                "flex",
                "items-end",
                "justify-between",
                "py-1 px-2",
                "[[data-numeric]_&]:flex-row-reverse",
                {
                    "cursor-pointer": sortable,
                    "hover:bg-accent hover:text-accent-foreground": sortable,
                    "hover:rounded": sortable,
                },
            ],
        },
        /** The header label text slot. It remains unstyled by default so field-specific header slots can inherit the surrounding table header rhythm. */
        label: {
            class: {},
        },
        /** The sort icon wrapper beside the header label. It adds a small leading offset while numeric headers reverse the parent flex direction to keep sort state from shifting the right edge. */
        sortIcon: {
            class: ["pl-1", "text-center"],
        },
        /** The multi-sort priority chip. It uses compact mono numerals to show sort precedence without competing with the field label. */
        multiSortNumber: {
            class: [
                "inline-flex items-center justify-center",
                "min-w-[14px] h-[14px] px-1 ml-1 rounded-vueda-control",
                "bg-[color-mix(in_oklab,var(--muted-foreground)_18%,transparent)] text-muted-foreground",
                "font-mono text-[9px] font-semibold tracking-[0.04em]",
            ],
        },
    },
});
