/**
 * @module theme/vueda-tailwind/navigation/SidebarFooter.theme
 *
 * Per-component theme registration for SidebarFooter. Imported as a side effect by
 * SidebarFooter.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire navigation family.
 *
 * Prototype-phase duplication: this entry mirrors the SidebarFooter slice of
 * navigation/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SidebarFooter styles footer content placed at the bottom of a sidebar.
     */
    SidebarFooter: {
        /** Bottom sidebar section for account and secondary controls, using the same padding cadence as the header. */
        root: {
            class: "flex flex-col gap-2 p-2",
        },
    },
});
