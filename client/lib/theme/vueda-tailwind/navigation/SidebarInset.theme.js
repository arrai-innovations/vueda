/**
 * @module theme/vueda-tailwind/navigation/SidebarInset.theme
 *
 * Per-component theme registration for SidebarInset. Imported as a side effect by
 * SidebarInset.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the SidebarInset slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarInset styles the main content wrapper that sits beside or within a sidebar layout.
     */
    SidebarInset: {
        /** Main content wrapper adjacent to the sidebar. Inset variant chrome exists in source but is not the admin-app default. */
        root: {
            class: [
                "bg-background text-foreground relative flex min-w-0 flex-1 flex-col",
                "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-vueda-card md:peer-data-[variant=inset]:shadow-vueda-card md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
            ],
        },
    },
});
