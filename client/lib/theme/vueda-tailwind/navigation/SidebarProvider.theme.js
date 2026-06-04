/**
 * @module theme/vueda-tailwind/navigation/SidebarProvider.theme
 *
 * Per-component theme registration for SidebarProvider. Imported as a side effect by
 * SidebarProvider.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the SidebarProvider slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarProvider styles the layout wrapper that provides sidebar state to descendants.
     */
    SidebarProvider: {
        /** Layout wrapper that scopes sidebar state selectors and inset variant background behavior. */
        root: {
            class: "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
        },
    },
});
