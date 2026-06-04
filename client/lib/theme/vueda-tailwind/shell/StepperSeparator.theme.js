/**
 * @module theme/vueda-tailwind/shell/StepperSeparator.theme
 *
 * Per-component theme registration for StepperSeparator. Imported as a side effect by
 * StepperSeparator.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 *
 * Prototype-phase duplication: this entry mirrors the StepperSeparator slice of
 * shell/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * StepperSeparator styles the connector line between steps.
     */
    StepperSeparator: {
        /**
         * The connector line between steps. It stays muted for upcoming or disabled steps and switches to accent after completion.
         */
        root: {
            class: [
                "flex-1 h-0.5 min-w-6 rounded-sm mt-4 transition-colors",
                "bg-muted",
                "group-data-[disabled]:bg-muted group-data-[disabled]:opacity-50",
                "group-data-[state=completed]:bg-accent",
            ],
        },
    },
});
