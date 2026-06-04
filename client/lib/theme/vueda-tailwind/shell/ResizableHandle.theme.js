/**
 * @module theme/vueda-tailwind/shell/ResizableHandle.theme
 *
 * Per-component theme registration for ResizableHandle. Imported as a side effect by
 * ResizableHandle.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the ResizableHandle slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ResizableHandle styles the draggable separator between resizable panels.
     */
    ResizableHandle: {
        /**
         * The draggable divider between resizable panels. It expands the hit area around the 1px visual rule and adapts the affordance for horizontal or vertical panel groups.
         */
        root: {
            class: "bg-border relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-1 data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:-translate-y-1/2 data-[orientation=vertical]:after:translate-x-0 [&[data-orientation=vertical]>div]:rotate-90",
        },
        /**
         * The visible grip inside a resizable handle. It gives pointer users a small bordered target without changing the panel separator's actual layout width.
         */
        handle: {
            class: "bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border",
        },
    },
});
