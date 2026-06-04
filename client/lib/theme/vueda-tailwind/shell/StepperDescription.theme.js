/**
 * @module theme/vueda-tailwind/shell/StepperDescription.theme
 *
 * Per-component theme registration for StepperDescription. Imported as a side effect by
 * StepperDescription.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the StepperDescription slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * StepperDescription styles supporting text beneath a step title.
     */
    StepperDescription: {
        /**
         * The supporting text beneath a step title. It uses muted extra-small text for optional detail below the primary label.
         */
        root: {
            class: "text-xs text-muted-foreground",
        },
    },
});
