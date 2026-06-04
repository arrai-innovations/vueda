/**
 * @module theme/vueda-tailwind/form/FormModel.theme
 *
 * Per-component theme registration for FormModel. Imported as a side effect by
 * FormModel.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 *
 * Prototype-phase duplication: this entry mirrors the FormModel slice of
 * form/index.js, which remains the docs-tooling source of truth until the
 * extractor learns to walk *.theme.js files. Under the legacy
 * setTheme(vuedaTailwind) path the wholesale replace overwrites this patch with
 * identical data.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Model-driven form container that renders configured fields. Provides the
     * field stack, optional label, and before/after hooks used by generated
     * create and update forms.
     */
    FormModel: {
        /** Root model-form wrapper. */
        root: {
            class: [],
        },
        /** Vertical stack for generated fields. */
        inner: {
            class: ["flex flex-col"],
        },
        /** Optional model-form label above the generated field stack. */
        label: {
            class: ["ml-2 leading-7", "text-neutral-900/60 dark:text-white/60"],
        },
        /** Hook before the generated fields. */
        beforeFields: {
            class: [],
        },
        /** Hook after the generated fields. */
        afterFields: {
            class: [],
        },
        /** Container for generated field entries. */
        fields: {
            class: [],
        },
        /** Wrapper around each generated field. */
        field: {
            class: [
                // "rounded", "px-1 lg:px-2 py-1 lg:py-2", "mb-2 lg:mb-4"
            ],
        },
        /** Pass-through wrapper immediately inside a generated field. */
        fieldInner: {
            class: [],
        },
    },
});
