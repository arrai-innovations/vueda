/**
 * @module theme/vueda-tailwind/widgets/WidgetGenericAutoComplete.theme
 *
 * Per-component theme registration for WidgetGenericAutoComplete. Imported as a side effect by
 * WidgetGenericAutoComplete.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire widgets family.
 *
 * Prototype-phase duplication: this entry mirrors the WidgetGenericAutoComplete slice of
 * widgets/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Generic autocomplete widget with separate dropdown and autocomplete
     * controls. Keeps both control columns aligned while allowing the text
     * input area to grow.
     */
    WidgetGenericAutoComplete: {
        /** The root remains unstyled so the widget can sit inside any form shell. */
        root: {
            class: [],
        },
        /** The inner row wraps the dropdown and text lookup controls together. */
        inner: {
            class: ["flex flex-row gap-2 flex-wrap"],
        },
        /** The dropdown column keeps only the width its trigger needs. */
        dropdownOuter: {
            class: ["flex flex-col flex-shrink"],
        },
        /** The autocomplete column grows to absorb remaining row width. */
        autoCompleteOuter: {
            class: ["flex flex-col flex-grow"],
        },
    },
});
