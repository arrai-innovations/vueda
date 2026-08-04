/**
 * @module theme/vueda-tailwind/widgets/WidgetCheckbox.theme
 *
 * Per-component theme registration for WidgetCheckbox. Imported as a side effect by
 * WidgetCheckbox.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Checkbox-backed widget wrapper for boolean fields. Adjusts the shared
     * label treatment so the toggle control and label align as one row.
     */
    WidgetCheckbox: {
        /** The outer row aligns the checkbox control with its label chrome. */
        root: {
            class: ["ml-2 flex flex-row grow items-baseline"],
        },
        /** The inner row lets the control and label share the available width. */
        inner: {
            class: ["flex flex-row grow items-baseline"],
        },
        /** The checkbox input keeps its intrinsic width instead of stretching. */
        input: {
            class: ["min-w-min grow-0 shrink-0"],
        },
        /** Local label overrides make {@api theme-key:WidgetLabel} read as a toggle row. */
        themeOverride: {
            WidgetLabel: {
                root: {
                    class: {
                        grid: false,
                        // items-baseline doesn't play nice with the toggle switch
                        "flex gap-2 items-center": true,
                        "ml-2 mb-1": false,
                    },
                },
                label: {
                    class: {
                        "leading-7": false,
                    },
                },
            },
        },
    },
});
