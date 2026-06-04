/**
 * @module theme/vueda-tailwind/display/ClickToCopyText.theme
 *
 * Per-component theme registration for ClickToCopyText. Imported as a side effect by
 * ClickToCopyText.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 *
 * Prototype-phase duplication: this entry mirrors the ClickToCopyText slice of
 * display/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ClickToCopyText lays out copyable text with its affordance on the same baseline. It is used for compact read-only values that can be copied.
     */
    ClickToCopyText: {
        /** Baseline row for a compact read-only value and its copy affordance. */
        root: {
            class: "flex flex-row items-baseline gap-1 p-1 2xs:p-2 2xl:p-4 ",
        },
    },
});
