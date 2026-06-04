/**
 * @module theme/vueda-tailwind/navigation/ContextMenuContent.theme
 *
 * Per-component theme registration for ContextMenuContent. Imported as a side effect by
 * ContextMenuContent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the ContextMenuContent slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ContextMenuContent styles the floating context menu surface.
     */
    ContextMenuContent: {
        /** Context-menu surface. Matches {@api theme-key:DropdownMenuContent.root} while using context-menu collision sizing. */
        root: {
            class: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--reka-context-menu-content-available-height) min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-vueda-control border p-1 shadow-vueda-popover",
        },
    },
});
