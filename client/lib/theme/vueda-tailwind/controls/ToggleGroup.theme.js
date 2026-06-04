/**
 * @module theme/vueda-tailwind/controls/ToggleGroup.theme
 *
 * Per-component theme registration for ToggleGroup. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire controls family.
 *
 * Prototype-phase duplication: this entry mirrors the ToggleGroup slice of
 * controls/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Layout shell for a row of ToggleGroupItems.
     */
    ToggleGroup: {
        /** The row layout for a set of {@api theme-key:ToggleGroupItem.root} children. The `--gap` custom property is driven by the consumer's `spacing` prop, which lets the same group render as a gapped row or (at `spacing=0`) as a segmented control where child items drop their outer radii and shared borders. The `group/toggle-group` Tailwind group label lets items react to group-level state. */
        root: {
            class: ["group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-vueda-control"],
        },
    },
});
