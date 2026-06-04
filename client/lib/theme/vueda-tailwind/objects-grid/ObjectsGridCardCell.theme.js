/**
 * @module theme/vueda-tailwind/objects-grid/ObjectsGridCardCell.theme
 *
 * Per-component theme registration for ObjectsGridCardCell. Imported as a side
 * effect by ObjectsGridCardCell.vue and ObjectsGridCardCellSkeleton.vue, so a
 * route chunk that pulls only those SFCs drags only this component's theme
 * entry, not the entire objects-grid family.
 *
 * Prototype-phase duplication: this entry mirrors the ObjectsGridCardCell slice
 * of objects-grid/index.js, which remains the docs-tooling source of truth until
 * the extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Label and value fragment for a single field in the card layout inside
     * `ObjectsGrid`. The component has no wrapper, so its header and value
     * participate directly in the parent card grid.
     */
    ObjectsGridCardCell: {
        /** The card-layout field label fragment. It renders as a compact muted micro-label that participates directly in {@api theme-key:ObjectsGrid.cardContainer}. */
        header: {
            class: [
                "self-baseline whitespace-nowrap",
                "text-[10px] font-semibold uppercase tracking-[0.06em]",
                "text-muted-foreground",
                "select-none",
            ],
        },
        /** The card-layout field value fragment. It aligns on the same baseline as the header and uses foreground body text for the row's readable data. */
        value: {
            class: ["self-baseline", "text-[13px] font-normal text-foreground"],
        },
    },
});
