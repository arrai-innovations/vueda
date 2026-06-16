/**
 * @module theme/vueda-tailwind/form/FilterFieldForm.theme
 *
 * Per-component theme registration for FilterFieldForm. Imported as a side
 * effect by FilterFieldForm.vue, so a route chunk that pulls only that SFC
 * drags only this component's theme entry, not the entire form family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * FilterFieldForm renders a single field's filter form inside the add-filter
     * menu drill-in or a chip's edit popover. It only themes the submit row; the
     * heading and field widget come from {@api theme-key:FilterForm} and
     * {@api theme-key:FormModel}.
     */
    FilterFieldForm: {
        /** Submit row at the foot of the form. Apply alone (right-aligned) when adding; Remove + Apply split apart when editing an active filter. */
        actions: {
            class: ({ showRemove }) => ["mt-1 flex items-center gap-2", showRemove ? "justify-between" : "justify-end"],
        },
        /** Remove control, shown only when editing an active filter; destructive text since it discards the filter. */
        remove: {
            class: ["text-destructive"],
        },
    },
});
