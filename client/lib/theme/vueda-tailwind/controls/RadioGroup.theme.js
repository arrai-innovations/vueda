/**
 * @module theme/vueda-tailwind/controls/RadioGroup.theme
 *
 * Per-component theme registration for RadioGroup. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the RadioGroup slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Layout shell for a vertical run of RadioGroupItems.
     */
    RadioGroup: {
        /** Layout shell for a vertical run of {@api theme-key:RadioGroupItem.root}. 12px gap (`gap-3`) so the items breathe at the form-level density; the items, not the group, carry the focus and `aria-invalid` rings, so the group itself is a transparent layout container. Override to `flex` or `grid-flow-col` for a horizontal stack without touching the per-item contract. */
        root: {
            class: ["grid gap-3"],
        },
    },
});
