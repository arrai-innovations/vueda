/**
 * @module theme/vueda-tailwind/navigation/ContextMenuTrigger.theme
 *
 * Per-component theme registration for ContextMenuTrigger. Imported as a side effect by
 * ContextMenuTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the ContextMenuTrigger slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ContextMenuTrigger provides the target that opens a context menu.
     */
    ContextMenuTrigger: {
        /** Unstyled trigger pass-through for the element that owns the context-menu gesture. */
        root: { class: "" },
    },
});
