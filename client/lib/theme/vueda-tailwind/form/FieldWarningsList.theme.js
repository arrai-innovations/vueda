/**
 * @module theme/vueda-tailwind/form/FieldWarningsList.theme
 *
 * Per-component theme registration for FieldWarningsList. Imported as a side effect by
 * FieldWarningsList.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire form family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * Renders one object's field-keyed warnings mapping. Shared by FormConfirmDialog's default
     * warnings rendering and by ModelActionForm's per-object warning groups.
     */
    FieldWarningsList: {
        /** Wrapper stacking each field's warning entry. */
        root: {
            class: ["flex flex-col gap-1"],
        },
        /** Message list: the non-field-errors list, or a multi-message field's own list. */
        list: {
            class: ["list-disc ps-5 text-foreground m-0"],
        },
        /** Wrapper for a field that carries more than one message: the field-name sub-header stacked above its own message list. */
        field: {
            class: ["flex flex-col gap-1"],
        },
        /** Field-name label: a sub-header above a multi-message field's list, or the inline prefix before a single-message field's text. */
        fieldName: {
            class: ["font-medium text-muted-foreground pr-2"],
        },
        /** Single-line rendering for a field that carries exactly one message: `field: message` inline, no separate list. */
        fieldInline: {
            class: ["text-foreground"],
        },
    },
});
