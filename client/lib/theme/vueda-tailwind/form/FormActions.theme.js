/**
 * @module theme/vueda-tailwind/form/FormActions.theme
 *
 * Split support theme registration for FormActions. No direct SFC consumer
 * currently imports this module; it exists so the form family can be completed
 * during Phase 3 or future aggregator wiring without returning to index.js.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Action row for form submit, cancel, or secondary controls. Keeps actions
     * wrapping cleanly and exposes a spacer slot for right-aligned groups.
     */
    FormActions: {
        /** Wrapping action row for submit, cancel, and secondary controls. */
        root: {
            class: "flex flex-wrap gap-2 pt-2 mt-1",
        },
        /** Flexible spacer for splitting left and right action groups. */
        spacer: {
            class: "flex-1",
        },
    },
});
