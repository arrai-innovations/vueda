/**
 * @module theme/vueda-tailwind/navigation/NavigationMenuViewport.theme
 *
 * Per-component theme registration for NavigationMenuViewport. Imported as a side effect by
 * NavigationMenuViewport.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the NavigationMenuViewport slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * NavigationMenuViewport styles the animated viewport that hosts navigation menu panels.
     */
    NavigationMenuViewport: {
        /** Absolute wrapper that positions the shared viewport below the trigger row. */
        wrapper: {
            class: "absolute top-full left-0 isolate z-50 flex justify-center",
        },
        /** Shared animated popover surface for navigation panels. See also: {@api theme-key:NavigationMenuContent.root}. */
        root: {
            class: "origin-top-center bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 relative mt-1.5 h-[var(--reka-navigation-menu-viewport-height)] w-full overflow-hidden rounded-vueda-control border shadow-vueda-popover md:w-[var(--reka-navigation-menu-viewport-width)] left-[var(--reka-navigation-menu-viewport-left)]",
        },
    },
});
