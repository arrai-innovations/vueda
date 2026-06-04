/**
 * @module theme/vueda-tailwind/views/ViewAction.theme
 *
 * Per-component theme registration for ViewAction. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 *
 * Prototype-phase duplication: this entry mirrors the ViewAction slice of
 * views/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ViewAction is the outer theme entry for generic action views that supply
     * their own internal content.
     */
    ViewAction: {
        /** Outer wrapper around the embedded {@api theme-key:PageTitle} and {@api theme-key:ModelActionForm}. Empty by default; the two inner shells own all visible chrome, so this key exists only as the consumer-facing override surface and the data-qa anchor. */
        root: {
            class: [],
        },
    },
});
