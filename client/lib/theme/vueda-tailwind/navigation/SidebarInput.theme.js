/**
 * @module theme/vueda-tailwind/navigation/SidebarInput.theme
 *
 * Per-component theme registration for SidebarInput. Imported as a side effect by
 * SidebarInput.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the SidebarInput slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarInput styles search or filter fields embedded in a sidebar.
     */
    SidebarInput: {
        /** Sidebar-local input chrome. It binds hairline and focus colors to sidebar tokens rather than generic input tokens. */
        root: {
            class: "bg-background h-8 w-full shadow-none [--vueda-hairline-color:var(--sidebar-border)]! focus-visible:[--vueda-hairline-color:var(--sidebar-ring)]!",
        },
    },
});
