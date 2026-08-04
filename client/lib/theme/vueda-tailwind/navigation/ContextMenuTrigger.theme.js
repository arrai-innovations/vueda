/**
 * @module theme/vueda-tailwind/navigation/ContextMenuTrigger.theme
 *
 * Per-component theme registration for ContextMenuTrigger. Imported as a side effect by
 * ContextMenuTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
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
