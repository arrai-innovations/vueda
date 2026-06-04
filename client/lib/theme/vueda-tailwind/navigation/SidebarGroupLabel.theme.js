/**
 * @module theme/vueda-tailwind/navigation/SidebarGroupLabel.theme
 *
 * Per-component theme registration for SidebarGroupLabel. Imported as a side effect by
 * SidebarGroupLabel.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the SidebarGroupLabel slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarGroupLabel styles the heading text for a sidebar group.
     */
    SidebarGroupLabel: {
        /** Sidebar group heading using the page-level eyebrow recipe. */
        root: {
            class: [
                "text-muted-foreground flex h-6 shrink-0 items-center px-2 text-[length:var(--vueda-text-micro)] font-semibold uppercase tracking-[0.08em] transition-[margin,opacity] duration-200 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring [&>svg]:size-4 [&>svg]:shrink-0",
                "group-data-[collapsible=icon]:-mt-6 group-data-[collapsible=icon]:opacity-0",
            ],
        },
    },
});
