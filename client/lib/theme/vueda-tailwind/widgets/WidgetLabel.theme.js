/**
 * @module theme/vueda-tailwind/widgets/WidgetLabel.theme
 *
 * Per-component theme registration for WidgetLabel. This support entry is split
 * for Phase 3 or future aggregator wiring, but is not currently imported by an
 * SFC because there is no WidgetLabel.vue in this tree.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Shared widget label wrapper. Coordinates visible, hidden, required, help,
     * warning, invalid, feedback, and control regions around the active widget.
     */
    WidgetLabel: {
        /** The root grid pairs label text with feedback actions above the control. */
        root: ({ isCardLayout, hidden, required, help, warning, invalid }) => {
            const isRequiredHasHelpOrHasValidation = required || help || warning || invalid;
            return {
                class: {
                    "ml-2 mb-1": !isCardLayout,
                    "gap-1": true,
                    // not items-baseline, checkboxes and buttons don't play well with it
                    // nor items-center, cells in the row stretch to fill the row by default
                    "grid grid-cols-[auto_1fr] justify-between": !hidden,
                    "flex flex-row items-baseline": hidden && isRequiredHasHelpOrHasValidation,
                },
            };
        },
        /** The label moves between visible grid text and screen-reader-only text when hidden. */
        label: {
            class: ({ warning, invalid, hidden, required, help }) => {
                const showingButton = warning || invalid || help || required;
                return {
                    "sr-only": hidden,
                    "row-start-1 row-end-2 col-start-1": !hidden,
                    "col-end-2": !hidden && showingButton,
                    "col-end-3": !hidden && !showingButton,
                    "leading-[2.3958125rem]": true,
                    "text-neutral-900/60 dark:text-white/60": true,
                    "!text-amber-600 dark:!text-amber-500": warning,
                    "!text-maroon-600 dark:!text-maroon-500": invalid,
                };
            },
        },
        /** The feedback slot sits at the row end for help, required, warning, and invalid affordances. */
        feedback: ({ hidden }) => ({
            class: {
                "row-start-1 row-end-2 col-start-2 col-end-3": !hidden,
                "justify-self-end min-w-max": !hidden,
            },
        }),
        /** The control slot spans the full second row unless the label is hidden. */
        control: ({ hidden }) => {
            return {
                class: {
                    "row-start-2 row-end-3 col-start-1 col-end-3": !hidden,
                    grow: hidden,
                },
            };
        },
        /** The required marker uses destructive status color. */
        required: {
            class: ["text-red-500 dark:text-red-400", "ml-1", "cursor-help"],
        },
    },
});
