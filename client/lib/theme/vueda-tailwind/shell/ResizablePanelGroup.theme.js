/**
 * @module theme/vueda-tailwind/shell/ResizablePanelGroup.theme
 *
 * Per-component theme registration for ResizablePanelGroup. Imported as a side effect by
 * ResizablePanelGroup.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the ResizablePanelGroup slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ResizablePanelGroup styles the flex container that holds resizable panels.
     */
    ResizablePanelGroup: {
        /**
         * The flex container for resizable panels. It switches from row to column layout when the panel group orientation is vertical.
         */
        root: {
            class: "flex h-full w-full data-[orientation=vertical]:flex-col",
        },
    },
});
