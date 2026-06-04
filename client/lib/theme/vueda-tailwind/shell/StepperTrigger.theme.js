/**
 * @module theme/vueda-tailwind/shell/StepperTrigger.theme
 *
 * Per-component theme registration for StepperTrigger. Imported as a side effect by
 * StepperTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the StepperTrigger slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * StepperTrigger styles the interactive control for selecting a step.
     */
    StepperTrigger: {
        /**
         * The selectable control for a step. It stacks indicator and label content in a compact centered column with a modest focusable radius.
         */
        root: {
            class: "p-1 flex flex-col items-center text-center gap-1 rounded-md",
        },
    },
});
