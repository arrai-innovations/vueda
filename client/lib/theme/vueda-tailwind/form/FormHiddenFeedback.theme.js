/**
 * @module theme/vueda-tailwind/form/FormHiddenFeedback.theme
 *
 * Split support theme registration for FormHiddenFeedback. No direct SFC
 * consumer currently imports this module; it exists so the form family can be
 * completed during Phase 3 or future aggregator wiring without returning to
 * index.js.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Compact feedback indicator for hidden or space-constrained fields.
     * Groups required, error, warning, and help affordances behind a popover.
     */
    FormHiddenFeedback: {
        /** Compact wrapper for hidden-field feedback controls. */
        root: {
            class: "min-w-min",
        },
        /** Vertical stack inside the hidden-feedback popover. */
        popoverBody: {
            class: "flex flex-col gap-1 md:gap-2 2xl:gap-4",
        },
        /** One feedback row inside the popover. */
        popoverItem: {
            class: [],
        },
        /** Trigger button for the hidden-feedback popover. */
        button: {
            class: [],
        },
        /** Feedback trigger or row icon. */
        icon: {
            class: [],
        },
        /** Required-field indicator inside the compact feedback group. */
        required: {
            class: [],
        },
        /** Error indicator inside the compact feedback group. */
        errors: {
            class: [],
        },
        /** Warning indicator inside the compact feedback group. */
        warnings: {
            class: [],
        },
        /** Help indicator inside the compact feedback group. */
        help: {
            class: [],
        },
    },
});
