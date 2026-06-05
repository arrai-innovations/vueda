/**
 * @module theme/vueda-tailwind/form/FilterComponent.theme
 *
 * Per-component theme registration for FilterComponent. Imported as a side effect by
 * FilterComponent.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 *
 * Prototype-phase duplication: this entry mirrors the FilterComponent slice of
 * form/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Button-triggered filter popover for a single list filter. Styles the
     * clear/dropdown buttons and the popover body that hosts the filter form.
     */
    FilterComponent: {
        /** Root wrapper for one filter control in a filter toolbar. */
        root: {},
        /** Clear action that becomes dashed when inactive and red when the filter errors. */
        clearButton: {
            class: ({ hasFilterValue, errored }) => ({
                "!border-dashed": !hasFilterValue,
                "!border-destructive !text-destructive": errored,
            }),
        },
        /** Dropdown trigger mirrors clear-button state so inactive and errored filters read consistently. */
        dropdownButton: {
            class: ({ hasFilterValue, errored }) => ({
                "!border-dashed": !hasFilterValue,
                "!border-destructive !text-destructive": errored,
            }),
        },
        /** Popover body width floor for the filter form. */
        formPopover: {
            class: ["sm:min-w-[25%]"],
        },
    },
});
